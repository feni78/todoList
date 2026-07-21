"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScoreValue } from "@/types";
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
    id: string;
    group_id: string;
    member_id: string;
    title: string;
    situation: string;
    status: string;
    memo: string | null;
  }[]
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("wishes").insert(chunk);
    if (error) throw error;
  }
}

async function insertVotesBatch(
  supabase: ReturnType<typeof createClient>,
  votes: { wish_id: string; member_id: string; score: ScoreValue }[]
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < votes.length; i += CHUNK) {
    const chunk = votes.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("wish_votes")
      .upsert(chunk, { onConflict: "wish_id,member_id" });
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

export function useCsvImport(groupId: string) {
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

      // インポート開始時にDBから最新データを取得
      const { data: freshWishes, error: fetchErr } = await supabase
        .from("wishes")
        .select("id, title, memo")
        .eq("group_id", groupId)
        .is("deleted_at", null);
      if (fetchErr) throw fetchErr;

      // URLまたはタイトルで既存wish IDを引けるMapを構築
      interface ExistingWish { id: string; title: string; memo: string | null; }
      const existing = (freshWishes ?? []) as ExistingWish[];

      const urlToExisting = new Map<string, ExistingWish>();
      const titleToExisting = new Map<string, ExistingWish>();
      for (const w of existing) {
        if (w.memo) {
          // buildMemoはURLをメモの末尾に置くため、最後の行からURLを抽出する
          const lines = w.memo.split("\n");
          const lastLine = lines[lines.length - 1].trim();
          if (/^https?:\/\//.test(lastLine)) urlToExisting.set(lastLine, w);
        }
        if (w.title) titleToExisting.set(w.title, w);
      }

      // Categorize
      interface NewItem extends ParsedItem { score: ScoreValue; memoText: string | null; }
      interface UpdateItem extends ParsedItem { wishId: string; score: ScoreValue; memoText: string | null; }

      const toInsert: NewItem[] = [];
      const toUpdate: UpdateItem[] = [];
      let skipped = 0;
      const handledKeys = new Set<string>(); // "url:<url>" or "title:<title>"

      for (const item of allItems) {
        const { row } = item;
        if (!row.title) { skipped++; continue; }

        const score = scoreFromMemo(row.memo);
        const memoText = buildMemo(row.memo, row.url);

        // URLで突合（URLあり優先）
        const matchByUrl = row.url ? urlToExisting.get(row.url) : undefined;
        // URLなし or URL未一致の場合はタイトルで突合
        const matchByTitle = !matchByUrl ? titleToExisting.get(row.title) : undefined;
        const existingMatch = matchByUrl ?? matchByTitle;
        const dedupeKey = row.url ? `url:${row.url}` : `title:${row.title}`;

        if (existingMatch) {
          if (handledKeys.has(dedupeKey)) { skipped++; continue; }
          handledKeys.add(dedupeKey);

          // 内容が変わっていなければスキップ
          const newMemo = memoText ?? null;
          if (existingMatch.title === row.title && existingMatch.memo === newMemo) {
            skipped++;
            continue;
          }
          toUpdate.push({ ...item, wishId: existingMatch.id, score, memoText });
        } else {
          toInsert.push({ ...item, score, memoText });
        }
      }

      // クライアント側でUUIDを生成し、挿入順序に依存しない
      const toInsertWithIds = toInsert.map((item) => ({
        ...item,
        id: crypto.randomUUID() as string,
      }));
      const insertedIds = toInsertWithIds.map((item) => item.id);

      try {
        // Batch insert new wishes
        if (toInsertWithIds.length > 0) {
          const wishRows = toInsertWithIds.map((item) => ({
            id: item.id,
            group_id: groupId,
            member_id: entry.memberId,
            title: item.row.title,
            situation: "OUTSIDE" as const,
            status: "PENDING" as const,
            memo: item.memoText ?? null,
          }));
          await insertBatch(supabase, wishRows);

          // Votes
          const voteRows = toInsertWithIds.map((item) => ({
            wish_id: item.id,
            member_id: entry.memberId,
            score: item.score,
          }));
          await insertVotesBatch(supabase, voteRows);

          // Genres
          const genreLinks: { wish_id: string; genre_id: string }[] = [];
          for (const item of toInsertWithIds) {
            for (const gid of item.genreIds) {
              genreLinks.push({ wish_id: item.id, genre_id: gid });
            }
          }
          if (genreLinks.length > 0) await insertGenresBatch(supabase, genreLinks);
        }

        // Update existing wishes
        for (const item of toUpdate) {
          const { error } = await supabase
            .from("wishes")
            .update({ title: item.row.title, memo: item.memoText ?? null })
            .eq("id", item.wishId);
          if (error) throw error;

          // Upsert vote（conflictを避けるためupsertを使用）
          const { error: voteErr } = await supabase
            .from("wish_votes")
            .upsert(
              { wish_id: item.wishId, member_id: entry.memberId, score: item.score },
              { onConflict: "wish_id,member_id" }
            );
          if (voteErr) throw voteErr;

          // Genres
          if (item.genreIds.length > 0) {
            await supabase.from("wish_genres").delete().eq("wish_id", item.wishId);
            const { error: genreErr } = await supabase.from("wish_genres").insert(
              item.genreIds.map((gid) => ({ wish_id: item.wishId, genre_id: gid }))
            );
            if (genreErr) throw genreErr;
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
    [groupId]
  );

  return { importFiles };
}
