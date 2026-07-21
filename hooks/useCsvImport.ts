"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wish, ScoreValue } from "@/types";
import { getGroupMember } from "@/lib/utils/localStorage";

export interface CsvRow {
  title: string;
  memo: string;
  url: string;
}

export interface FileImportConfig {
  file: File;
  genreIds: string[];
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export function parseCsvText(text: string): CsvRow[] {
  // テキスト全体を文字単位で処理し、クォート内の改行も正しく扱う
  const records: string[][] = [];
  let cur = "";
  let inQuote = false;
  let fields: string[] = [];

  const flush = () => { fields.push(cur); cur = ""; };
  const newRecord = () => { flush(); records.push(fields); fields = []; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { flush(); }
      else if (ch === '\r' && next === '\n') { newRecord(); i++; }
      else if (ch === '\n' || ch === '\r') { newRecord(); }
      else { cur += ch; }
    }
  }
  // 末尾に改行がない場合の残りを処理
  if (cur || fields.length > 0) newRecord();

  // ヘッダー行をスキップ、空行を除外
  const rows: CsvRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
    if (cols.every((c) => !c.trim())) continue;
    rows.push({
      title: (cols[0] ?? "").trim(),
      memo: (cols[1] ?? "").trim(),
      url: (cols[2] ?? "").trim(),
    });
  }
  return rows;
}

function scoreFromMemo(memo: string): ScoreValue {
  if (memo.includes("●●●")) return 30; // 金
  if (memo.includes("●●")) return 10;  // 銀
  return 5;                             // 銅
}

function buildMemo(csvMemo: string, url: string): string | null {
  if (!csvMemo && !url) return null;
  if (!csvMemo) return url;
  if (!url) return csvMemo;
  return `${csvMemo}\n${url}`;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = reject;
    reader.readAsText(file, "UTF-8");
  });
}

async function insertBatch(
  supabase: ReturnType<typeof createClient>,
  rows: {
    group_id: string;
    member_id: string;
    title: string;
    situation: string;
    status: string;
    memo: string | null;
  }[]
): Promise<string[]> {
  const CHUNK = 500;
  const ids: string[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("wishes").insert(chunk).select("id");
    if (error) throw error;
    ids.push(...(data ?? []).map((r) => r.id as string));
  }
  return ids;
}

async function insertVotesBatch(
  supabase: ReturnType<typeof createClient>,
  votes: { wish_id: string; member_id: string; score: ScoreValue }[]
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < votes.length; i += CHUNK) {
    const chunk = votes.slice(i, i + CHUNK);
    const { error } = await supabase.from("wish_votes").insert(chunk);
    if (error) throw error;
  }
}

async function insertGenresBatch(
  supabase: ReturnType<typeof createClient>,
  links: { wish_id: string; genre_id: string }[]
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < links.length; i += CHUNK) {
    const chunk = links.slice(i, i + CHUNK);
    const { error } = await supabase.from("wish_genres").insert(chunk);
    if (error) throw error;
  }
}

export function useCsvImport(groupId: string, existingWishes: Wish[]) {
  const importFiles = useCallback(
    async (configs: FileImportConfig[]): Promise<ImportResult> => {
      const entry = getGroupMember(groupId);
      if (!entry) throw new Error("メンバー情報が見つかりません");

      const supabase = createClient();

      // Parse all files
      interface ParsedItem {
        row: CsvRow;
        genreIds: string[];
      }
      const allItems: ParsedItem[] = [];
      for (const config of configs) {
        const text = await readFileAsText(config.file);
        const rows = parseCsvText(text);
        for (const row of rows) {
          allItems.push({ row, genreIds: config.genreIds });
        }
      }

      // Build URL → existing wish map
      const urlToWish = new Map<string, Wish>();
      for (const w of existingWishes) {
        if (!w.memo) continue;
        const match = w.memo.match(/https?:\/\/\S+/);
        if (match) urlToWish.set(match[0], w);
      }

      // Categorize
      interface NewItem extends ParsedItem { score: ScoreValue; memoText: string | null; }
      interface UpdateItem extends ParsedItem { wish: Wish; score: ScoreValue; memoText: string | null; }

      const toInsert: NewItem[] = [];
      const toUpdate: UpdateItem[] = [];
      let skipped = 0;

      for (const item of allItems) {
        const { row } = item;
        if (!row.title) { skipped++; continue; }

        const score = scoreFromMemo(row.memo);
        const memoText = buildMemo(row.memo, row.url);

        if (row.url && urlToWish.has(row.url)) {
          const existing = urlToWish.get(row.url)!;
          toUpdate.push({ ...item, wish: existing, score, memoText });
        } else {
          toInsert.push({ ...item, score, memoText });
        }
      }

      const insertedIds: string[] = [];
      try {
        // Batch insert new wishes
        if (toInsert.length > 0) {
          const wishRows = toInsert.map((item) => ({
            group_id: groupId,
            member_id: entry.memberId,
            title: item.row.title,
            situation: "OUTSIDE" as const,
            status: "PENDING" as const,
            memo: item.memoText ?? null,
          }));
          const ids = await insertBatch(supabase, wishRows);
          insertedIds.push(...ids);

          // Votes
          const voteRows = ids.map((id, i) => ({
            wish_id: id,
            member_id: entry.memberId,
            score: toInsert[i].score,
          }));
          await insertVotesBatch(supabase, voteRows);

          // Genres
          const genreLinks: { wish_id: string; genre_id: string }[] = [];
          ids.forEach((id, i) => {
            for (const gid of toInsert[i].genreIds) {
              genreLinks.push({ wish_id: id, genre_id: gid });
            }
          });
          if (genreLinks.length > 0) await insertGenresBatch(supabase, genreLinks);
        }

        // Update existing wishes
        for (const item of toUpdate) {
          const { error } = await supabase
            .from("wishes")
            .update({
              title: item.row.title,
              memo: item.memoText ?? null,
            })
            .eq("id", item.wish.id);
          if (error) throw error;

          // Upsert vote
          const { data: existingVote } = await supabase
            .from("wish_votes")
            .select("id")
            .eq("wish_id", item.wish.id)
            .eq("member_id", entry.memberId)
            .maybeSingle();
          if (existingVote) {
            await supabase.from("wish_votes").update({ score: item.score }).eq("id", existingVote.id);
          } else {
            await supabase.from("wish_votes").insert({ wish_id: item.wish.id, member_id: entry.memberId, score: item.score });
          }

          // Genres
          if (item.genreIds.length > 0) {
            await supabase.from("wish_genres").delete().eq("wish_id", item.wish.id);
            await supabase.from("wish_genres").insert(
              item.genreIds.map((gid) => ({ wish_id: item.wish.id, genre_id: gid }))
            );
          }
        }

        return { inserted: toInsert.length, updated: toUpdate.length, skipped };
      } catch (err) {
        // Rollback: delete inserted wishes
        if (insertedIds.length > 0) {
          const CHUNK = 500;
          for (let i = 0; i < insertedIds.length; i += CHUNK) {
            await supabase.from("wishes").delete().in("id", insertedIds.slice(i, i + CHUNK));
          }
        }
        throw err;
      }
    },
    [groupId, existingWishes]
  );

  return { importFiles };
}
