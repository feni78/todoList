"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type FilePreset = { largeGenreId: string | null; mediumGenreId: string | null };
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
  existingGenreIds?: string[];
}

export interface FileConflictWarn {
  fileName: string;
  conflictCount: number;
  totalMatched: number;
}

export interface FuzzyMatchCandidate {
  wishId: string;
  wishTitle: string;
}

export interface FuzzySkipItem {
  csvTitle: string;
  largeGenreId: string | null;
  mediumGenreId: string | null;
  smallGenreName: string;
  candidates: FuzzyMatchCandidate[];
}

export interface GenreAssignAnalysis {
  fileConflicts: FileConflict[];
  newItems: GenreAssignItem[];
  updateItems: GenreAssignItem[];
  conflictItems: GenreAssignItem[];
  skipItems: { title: string }[];
  fuzzySkipItems: FuzzySkipItem[];
  alreadyItems: GenreAssignItem[];
  fileConflictWarns: FileConflictWarn[];
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
      const exactSkipItems: { title: string }[] = [];
      const alreadyItems: GenreAssignItem[] = [];

      for (const [title, entries] of titleToEntries) {
        const wish = titleToWish.get(title);
        if (!wish) {
          exactSkipItems.push({ title });
          continue;
        }

        // 複数ファイルに存在し、大/中ジャンルの設定が異なる場合はファイル競合
        // 未設定/未設定のエントリは選択肢に含めない
        if (entries.length > 1) {
          const validEntries = entries.filter(
            (e) => e.config.largeGenreId !== null || e.config.mediumGenreId !== null
          );
          const entriesToCheck = validEntries.length > 0 ? validEntries : entries;
          const uniqueKeys = new Set(entriesToCheck.map((e) => `${e.config.largeGenreId}:${e.config.mediumGenreId}`));
          if (uniqueKeys.size > 1) {
            // 既に全ジャンル（大・中・小）が付与済みのオプションは除外
            const isOptionAlreadyAssigned = (e: typeof entriesToCheck[0]) => {
              const largeOk = !e.config.largeGenreId || wish.genreIds.includes(e.config.largeGenreId);
              const mediumOk = !e.config.mediumGenreId || wish.genreIds.includes(e.config.mediumGenreId);
              const existingSmall = genres.find((g) => g.name === e.smallGenreName && g.genreType === "SMALL");
              const smallOk = existingSmall ? wish.genreIds.includes(existingSmall.id) : false;
              return largeOk && mediumOk && smallOk;
            };
            const unassignedEntries = entriesToCheck.filter((e) => !isOptionAlreadyAssigned(e));
            if (unassignedEntries.length === 0) {
              // 全オプション付与済み
              alreadyItems.push({
                wishId: wish.id,
                wishTitle: title,
                largeGenreId: entriesToCheck[0].config.largeGenreId,
                mediumGenreId: entriesToCheck[0].config.mediumGenreId,
                smallGenreName: entriesToCheck[0].smallGenreName,
                existingGenreIds: wish.genreIds,
              });
              continue;
            }
            fileConflicts.push({
              wishId: wish.id,
              wishTitle: title,
              options: unassignedEntries.map((e) => ({
                fileName: e.config.file.name,
                smallGenreName: e.smallGenreName,
                largeGenreId: e.config.largeGenreId,
                mediumGenreId: e.config.mediumGenreId,
              })),
            });
            continue;
          }
        }

        const validEntry = entries.find((e) => e.config.largeGenreId !== null || e.config.mediumGenreId !== null) ?? entries[0];
        const { config, smallGenreName } = validEntry;
        const item: GenreAssignItem = {
          wishId: wish.id,
          wishTitle: title,
          largeGenreId: config.largeGenreId,
          mediumGenreId: config.mediumGenreId,
          smallGenreName,
          existingGenreIds: wish.genreIds,
        };

        if (wish.genreIds.length === 0) {
          newItems.push(item);
        } else {
          const existingLarge = wish.genreIds.filter((id) => genreTypeMap.get(id) === "LARGE");
          const existingMedium = wish.genreIds.filter((id) => genreTypeMap.get(id) === "MEDIUM");
          const largeOk = !config.largeGenreId || existingLarge.includes(config.largeGenreId);
          const mediumOk = !config.mediumGenreId || existingMedium.includes(config.mediumGenreId);
          if (largeOk && mediumOk) {
            // 小ジャンルも付与済みか確認
            const existingSmallGenre = genres.find(
              (g) => g.name === smallGenreName && g.genreType === "SMALL"
            );
            const smallOk = existingSmallGenre
              ? wish.genreIds.includes(existingSmallGenre.id)
              : false;
            if (smallOk) {
              alreadyItems.push(item);
            } else {
              updateItems.push(item);
            }
          } else {
            conflictItems.push(item);
          }
        }
      }

      // exactSkipItems のうち部分一致候補があるものを fuzzySkipItems に振り分け
      const fuzzySkipItems: FuzzySkipItem[] = [];
      const skipItems: { title: string }[] = [];
      for (const skip of exactSkipItems) {
        const candidates: FuzzyMatchCandidate[] = [];
        for (const [wishTitle, wish] of titleToWish) {
          if (candidates.length >= 5) break;
          if (
            wishTitle.includes(skip.title) ||
            skip.title.includes(wishTitle)
          ) {
            candidates.push({ wishId: wish.id, wishTitle });
          }
        }
        if (candidates.length > 0) {
          const entries = titleToEntries.get(skip.title);
          if (entries && entries.length > 0) {
            const { config, smallGenreName } = entries[0];
            // 既に全ジャンル付与済みの候補を除外
            const unassignedCandidates = candidates.filter((cand) => {
              const wish = titleToWish.get(cand.wishTitle);
              if (!wish) return true;
              const largeOk = !config.largeGenreId || wish.genreIds.includes(config.largeGenreId);
              const mediumOk = !config.mediumGenreId || wish.genreIds.includes(config.mediumGenreId);
              const existingSmall = genres.find((g) => g.name === smallGenreName && g.genreType === "SMALL");
              const smallOk = existingSmall ? wish.genreIds.includes(existingSmall.id) : false;
              return !(largeOk && mediumOk && smallOk);
            });
            if (unassignedCandidates.length > 0) {
              fuzzySkipItems.push({
                csvTitle: skip.title,
                largeGenreId: config.largeGenreId,
                mediumGenreId: config.mediumGenreId,
                smallGenreName,
                candidates: unassignedCandidates,
              });
              continue;
            }
          }
        }
        skipItems.push(skip);
      }

      // ファイルごとの衝突割合を算出（50%以上で警告）
      const fileConflictWarns: FileConflictWarn[] = [];
      for (const config of configs) {
        const smallName = fileNameWithoutExt(config.file.name);
        const matched = [...newItems, ...updateItems, ...conflictItems].filter(
          (item) => item.smallGenreName === smallName
        ).length;
        const conflicts = conflictItems.filter((item) => item.smallGenreName === smallName).length;
        if (matched > 0 && conflicts / matched >= 0.5) {
          fileConflictWarns.push({ fileName: config.file.name, conflictCount: conflicts, totalMatched: matched });
        }
      }

      return { fileConflicts, newItems, updateItems, conflictItems, skipItems, fuzzySkipItems, alreadyItems, fileConflictWarns };
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

  const fetchPresets = useCallback(async (): Promise<Record<string, FilePreset>> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("csv_genre_file_presets")
      .select("file_name, large_genre_id, medium_genre_id")
      .eq("group_id", groupId);
    const result: Record<string, FilePreset> = {};
    for (const row of data ?? []) {
      result[row.file_name] = {
        largeGenreId: row.large_genre_id ?? null,
        mediumGenreId: row.medium_genre_id ?? null,
      };
    }
    return result;
  }, [groupId]);

  const savePresets = useCallback(async (updates: Record<string, FilePreset>): Promise<void> => {
    const supabase = createClient();
    const rows = Object.entries(updates).map(([file_name, p]) => ({
      group_id: groupId,
      file_name,
      large_genre_id: p.largeGenreId,
      medium_genre_id: p.mediumGenreId,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return;
    const { error } = await supabase
      .from("csv_genre_file_presets")
      .upsert(rows, { onConflict: "group_id,file_name" });
    if (error) console.error("[csv_genre_file_presets] upsert failed:", error);
  }, [groupId]);

  return { analyzeGenreAssign, applyGenreAssign, fetchPresets, savePresets };
}
