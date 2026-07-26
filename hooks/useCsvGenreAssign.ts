"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Genre, GenreType } from "@/types";
import { parseCsvText } from "@/hooks/useCsvImport";

export interface GenreFileConfig {
  file: File;
  largeGenreId: string | null;
  mediumGenreId: string | null;
}

export interface FileConflictOption {
  fileName: string;
  smallGenreName: string;
  largeGenreId: string | null;
  mediumGenreId: string | null;
}

export interface FileConflict {
  wishId: string;
  wishTitle: string;
  options: FileConflictOption[];
}

export interface GenreAssignItem {
  wishId: string;
  wishTitle: string;
  largeGenreId: string | null;
  mediumGenreId: string | null;
  smallGenreName: string;
}

export interface GenreAssignAnalysis {
  fileConflicts: FileConflict[];
  newItems: GenreAssignItem[];
  updateItems: GenreAssignItem[];
  conflictItems: GenreAssignItem[];
  skipItems: { title: string }[];
}

export interface GenreAssignResult {
  assigned: number;
  smallGenresCreated: number;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = reject;
    reader.readAsText(file, "UTF-8");
  });
}

export function fileNameWithoutExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export function useCsvGenreAssign(groupId: string, genres: Genre[]) {
  const genreTypeMap = new Map<string, GenreType>(genres.map((g) => [g.id, g.genreType]));

  const analyzeGenreAssign = useCallback(
    async (configs: GenreFileConfig[]): Promise<GenreAssignAnalysis> => {
      const supabase = createClient();

      // 1. CSV読み込み: タイトル → ファイルごとの設定リスト
      const titleToEntries = new Map<string, { config: GenreFileConfig; smallGenreName: string }[]>();
      for (const config of configs) {
        const text = await readFileAsText(config.file);
        const rows = parseCsvText(text);
        const smallGenreName = fileNameWithoutExt(config.file.name);
        for (const row of rows) {
          if (!row.title) continue;
          if (!titleToEntries.has(row.title)) titleToEntries.set(row.title, []);
          const list = titleToEntries.get(row.title)!;
          if (!list.some((e) => e.config.file.name === config.file.name)) {
            list.push({ config, smallGenreName });
          }
        }
      }

      // 2. 既存タスクをジャンル付きで取得
      type WishRow = { id: string; title: string; wish_genres: { genre_id: string }[] };
      let allRows: WishRow[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("wishes")
          .select("id, title, wish_genres(genre_id)")
          .eq("group_id", groupId)
          .is("deleted_at", null)
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        allRows = allRows.concat((data ?? []) as WishRow[]);
        if ((data ?? []).length < PAGE) break;
        from += PAGE;
      }

      const titleToWish = new Map<string, { id: string; genreIds: string[] }>();
      for (const row of allRows) {
        if (row.title) {
          titleToWish.set(row.title, {
            id: row.id,
            genreIds: (row.wish_genres ?? []).map((g) => g.genre_id),
          });
        }
      }

      // 3. 分類
      const fileConflicts: FileConflict[] = [];
      const newItems: GenreAssignItem[] = [];
      const updateItems: GenreAssignItem[] = [];
      const conflictItems: GenreAssignItem[] = [];
      const skipItems: { title: string }[] = [];

      for (const [title, entries] of titleToEntries) {
        const wish = titleToWish.get(title);
        if (!wish) {
          skipItems.push({ title });
          continue;
        }

        // 複数ファイルに存在し、大/中ジャンルの設定が異なる場合はファイル競合
        if (entries.length > 1) {
          const uniqueKeys = new Set(entries.map((e) => `${e.config.largeGenreId}:${e.config.mediumGenreId}`));
          if (uniqueKeys.size > 1) {
            fileConflicts.push({
              wishId: wish.id,
              wishTitle: title,
              options: entries.map((e) => ({
                fileName: e.config.file.name,
                smallGenreName: e.smallGenreName,
                largeGenreId: e.config.largeGenreId,
                mediumGenreId: e.config.mediumGenreId,
              })),
            });
            continue;
          }
        }

        const { config, smallGenreName } = entries[0];
        const item: GenreAssignItem = {
          wishId: wish.id,
          wishTitle: title,
          largeGenreId: config.largeGenreId,
          mediumGenreId: config.mediumGenreId,
          smallGenreName,
        };

        if (wish.genreIds.length === 0) {
          newItems.push(item);
        } else {
          const existingLarge = wish.genreIds.filter((id) => genreTypeMap.get(id) === "LARGE");
          const existingMedium = wish.genreIds.filter((id) => genreTypeMap.get(id) === "MEDIUM");
          const largeOk = !config.largeGenreId || existingLarge.includes(config.largeGenreId);
          const mediumOk = !config.mediumGenreId || existingMedium.includes(config.mediumGenreId);
          if (largeOk && mediumOk) {
            updateItems.push(item);
          } else {
            conflictItems.push(item);
          }
        }
      }

      return { fileConflicts, newItems, updateItems, conflictItems, skipItems };
    },
    [groupId, genreTypeMap]
  );

  const applyGenreAssign = useCallback(
    async (assignments: GenreAssignItem[]): Promise<GenreAssignResult> => {
      const supabase = createClient();

      // 小ジャンルを取得または作成
      const smallGenreNameToId = new Map<string, string>();
      const uniqueSmallNames = [...new Set(assignments.map((a) => a.smallGenreName).filter(Boolean))];
      let smallGenresCreated = 0;

      for (const name of uniqueSmallNames) {
        const existing = genres.find((g) => g.name === name && g.genreType === "SMALL");
        if (existing) {
          smallGenreNameToId.set(name, existing.id);
        } else {
          const { data, error } = await supabase
            .from("genres")
            .insert({ group_id: groupId, name, genre_type: "SMALL" })
            .select("id")
            .single();
          if (error) throw error;
          smallGenreNameToId.set(name, (data as { id: string }).id);
          smallGenresCreated++;
        }
      }

      // wish_genres リンクを構築してupsert
      const links: { wish_id: string; genre_id: string }[] = [];
      for (const a of assignments) {
        if (a.largeGenreId) links.push({ wish_id: a.wishId, genre_id: a.largeGenreId });
        if (a.mediumGenreId) links.push({ wish_id: a.wishId, genre_id: a.mediumGenreId });
        const smallId = smallGenreNameToId.get(a.smallGenreName);
        if (smallId) links.push({ wish_id: a.wishId, genre_id: smallId });
      }

      const CHUNK = 500;
      for (let i = 0; i < links.length; i += CHUNK) {
        const { error } = await supabase
          .from("wish_genres")
          .upsert(links.slice(i, i + CHUNK), { onConflict: "wish_id,genre_id", ignoreDuplicates: true });
        if (error) throw error;
      }

      return { assigned: assignments.length, smallGenresCreated };
    },
    [groupId, genres]
  );

  return { analyzeGenreAssign, applyGenreAssign };
}
