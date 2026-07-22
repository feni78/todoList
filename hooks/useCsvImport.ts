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

export interface SkippedItem {
  title: string;
  reason: "duplicate_url" | "duplicate_title" | "no_change";
}

export interface SuspiciousItem {
  title: string;
  url: string;
  matchedExistingTitle: string;
}

export interface UpdatePreviewItem {
  title: string;
  oldTitle?: string;      // タイトルが変わる場合の変更前タイトル
  memoAddition?: string;  // メモに追記される内容（先頭行）
  changes: string[];
}

export interface AnalyzeResult {
  insertCount: number;
  updateCount: number;
  skipCount: number;
  suspicious: SuspiciousItem[];
  insertItems: { title: string; url: string }[];
  updateItems: UpdatePreviewItem[];
  skipItems: SkippedItem[];
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  skippedItems: SkippedItem[];
  insertedItems: { title: string }[];
  updatedItems: { title: string }[];
}

// 既存メモと新メモをマージ（行単位で重複除去して追記）
function mergeMemos(existingMemo: string | null, newMemo: string | null): string | null {
  if (!existingMemo && !newMemo) return null;
  if (!existingMemo) return newMemo;
  if (!newMemo) return existingMemo;
  if (existingMemo === newMemo) return existingMemo;
  const existingSet = new Set(existingMemo.split("\n").map((l) => l.trim()).filter(Boolean));
  const toAdd = newMemo.split("\n").filter((l) => l.trim() && !existingSet.has(l.trim()));
  if (toAdd.length === 0) return existingMemo;
  return existingMemo + "\n" + toAdd.join("\n");
}

function memoWouldChange(existingMemo: string | null, newMemo: string | null): boolean {
  return mergeMemos(existingMemo, newMemo) !== existingMemo;
}

// URLの末尾スラッシュ・大文字小文字・前後空白を正規化して誤マッチを防ぐ
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/\/$/, "");
    return (u.origin + path).toLowerCase() + u.search + u.hash;
  } catch {
    return url.toLowerCase().trim();
  }
}

export function parseCsvText(text: string): CsvRow[] {
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
  if (cur || fields.length > 0) newRecord();

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
  if (memo.includes("●●●")) return 30;
  if (memo.includes("●●")) return 10;
  return 5;
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

interface ExistingWish { id: string; title: string; memo: string | null; }

interface ExistingMaps {
  urlToExisting: Map<string, ExistingWish>;
  titleToExisting: Map<string, ExistingWish>;
  titleToExistingCI: Map<string, ExistingWish>; // case-insensitive
}

async function fetchExisting(supabase: ReturnType<typeof createClient>, groupId: string): Promise<ExistingMaps> {
  const { data, error } = await supabase
    .from("wishes")
    .select("id, title, memo")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .limit(100000);
  if (error) throw error;

  const urlToExisting = new Map<string, ExistingWish>();
  const titleToExisting = new Map<string, ExistingWish>();
  const titleToExistingCI = new Map<string, ExistingWish>();

  for (const w of (data ?? []) as ExistingWish[]) {
    if (w.memo) {
      const lines = w.memo.split("\n");
      const lastLine = lines[lines.length - 1].trim();
      if (/^https?:\/\//.test(lastLine)) urlToExisting.set(normalizeUrl(lastLine), w);
    }
    if (w.title) {
      titleToExisting.set(w.title, w);
      titleToExistingCI.set(w.title.toLowerCase(), w);
    }
  }

  return { urlToExisting, titleToExisting, titleToExistingCI };
}

async function insertBatch(
  supabase: ReturnType<typeof createClient>,
  rows: { id: string; group_id: string; member_id: string; title: string; situation: string; status: string; memo: string | null }[]
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from("wishes").insert(rows.slice(i, i + CHUNK));
    if (error) throw error;
  }
}

async function insertVotesBatch(
  supabase: ReturnType<typeof createClient>,
  votes: { wish_id: string; member_id: string; score: ScoreValue }[]
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < votes.length; i += CHUNK) {
    const { error } = await supabase.from("wish_votes").upsert(votes.slice(i, i + CHUNK), { onConflict: "wish_id,member_id" });
    if (error) throw error;
  }
}

async function insertGenresBatch(
  supabase: ReturnType<typeof createClient>,
  links: { wish_id: string; genre_id: string }[]
): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < links.length; i += CHUNK) {
    const { error } = await supabase.from("wish_genres").insert(links.slice(i, i + CHUNK));
    if (error) throw error;
  }
}

export function useCsvImport(groupId: string) {
  // ドライラン：DB書き込みなしで件数と要確認アイテムを返す
  const analyzeImport = useCallback(async (configs: FileImportConfig[]): Promise<AnalyzeResult> => {
    const supabase = createClient();

    const allItems: { row: CsvRow; genreIds: string[] }[] = [];
    for (const config of configs) {
      const text = await readFileAsText(config.file);
      for (const row of parseCsvText(text)) {
        allItems.push({ row, genreIds: config.genreIds });
      }
    }

    const { urlToExisting, titleToExisting, titleToExistingCI } = await fetchExisting(supabase, groupId);

    let insertCount = 0, updateCount = 0, skipCount = 0;
    const suspicious: SuspiciousItem[] = [];
    const insertItems: { title: string; url: string }[] = [];
    const updateItems: UpdatePreviewItem[] = [];
    const skipItems: SkippedItem[] = [];
    const handledKeys = new Set<string>();

    for (const { row } of allItems) {
      if (!row.title) continue;

      const dedupeKey = row.url ? `url:${normalizeUrl(row.url)}` : `title:${row.title}`;
      if (handledKeys.has(dedupeKey)) {
        skipItems.push({ title: row.title, reason: row.url ? "duplicate_url" : "duplicate_title" });
        skipCount++;
        continue;
      }
      handledKeys.add(dedupeKey);

      const memoText = buildMemo(row.memo, row.url);
      const matchByUrl = row.url ? urlToExisting.get(normalizeUrl(row.url)) : undefined;
      const matchByTitle = !matchByUrl ? titleToExisting.get(row.title) : undefined;
      const existingMatch = matchByUrl ?? matchByTitle;

      if (existingMatch) {
        const newMemo = memoText ?? null;
        const titleChanged = existingMatch.title !== row.title;
        const memoWillChange = memoWouldChange(existingMatch.memo, newMemo);
        if (!titleChanged && !memoWillChange) {
          skipItems.push({ title: row.title, reason: "no_change" });
          skipCount++;
        } else {
          const changes: string[] = [];
          if (titleChanged) changes.push("タイトル変更");
          if (memoWillChange) changes.push("メモ追記");
          // 追記される内容の先頭行
          const merged = mergeMemos(existingMatch.memo, newMemo);
          const addition = merged && existingMatch.memo
            ? merged.slice(existingMatch.memo.length).trimStart().split("\n")[0]
            : undefined;
          updateItems.push({
            title: row.title,
            oldTitle: titleChanged ? existingMatch.title : undefined,
            memoAddition: memoWillChange ? addition : undefined,
            changes,
          });
          updateCount++;
        }
      } else {
        // 大文字小文字のみ異なる既存タイトルがあれば要確認
        const ciMatch = titleToExistingCI.get(row.title.toLowerCase());
        if (ciMatch && ciMatch.title !== row.title) {
          suspicious.push({ title: row.title, url: row.url, matchedExistingTitle: ciMatch.title });
        }
        insertCount++;
        insertItems.push({ title: row.title, url: row.url });
      }
    }

    return { insertCount, updateCount, skipCount, suspicious, insertItems, updateItems, skipItems };
  }, [groupId]);

  const importFiles = useCallback(
    async (configs: FileImportConfig[], treatSuspiciousAsExisting = false): Promise<ImportResult> => {
      const entry = getGroupMember(groupId);
      if (!entry) throw new Error("メンバー情報が見つかりません");

      const supabase = createClient();

      interface ParsedItem { row: CsvRow; genreIds: string[]; }
      const allItems: ParsedItem[] = [];
      for (const config of configs) {
        const text = await readFileAsText(config.file);
        for (const row of parseCsvText(text)) {
          allItems.push({ row, genreIds: config.genreIds });
        }
      }

      const { urlToExisting, titleToExisting, titleToExistingCI } = await fetchExisting(supabase, groupId);

      interface NewItem extends ParsedItem { score: ScoreValue; memoText: string | null; }
      interface UpdateItem extends ParsedItem { wishId: string; score: ScoreValue; memoText: string | null; existingMemo: string | null; }

      const toInsert: NewItem[] = [];
      const toUpdate: UpdateItem[] = [];
      const skippedItems: SkippedItem[] = [];
      const handledKeys = new Set<string>();

      for (const item of allItems) {
        const { row } = item;
        if (!row.title) continue;

        const dedupeKey = row.url ? `url:${normalizeUrl(row.url)}` : `title:${row.title}`;
        if (handledKeys.has(dedupeKey)) {
          skippedItems.push({ title: row.title, reason: row.url ? "duplicate_url" : "duplicate_title" });
          continue;
        }
        handledKeys.add(dedupeKey);

        const score = scoreFromMemo(row.memo);
        const memoText = buildMemo(row.memo, row.url);

        const matchByUrl = row.url ? urlToExisting.get(normalizeUrl(row.url)) : undefined;
        let matchByTitle = !matchByUrl ? titleToExisting.get(row.title) : undefined;
        // 要確認アイテムを既存として扱うモード：大文字小文字違いも一致とみなす
        if (!matchByUrl && !matchByTitle && treatSuspiciousAsExisting) {
          matchByTitle = titleToExistingCI.get(row.title.toLowerCase());
        }
        const existingMatch = matchByUrl ?? matchByTitle;

        if (existingMatch) {
          const newMemo = memoText ?? null;
          const titleChanged = existingMatch.title !== row.title;
          const memoWillChange = memoWouldChange(existingMatch.memo, newMemo);
          if (!titleChanged && !memoWillChange) {
            skippedItems.push({ title: row.title, reason: "no_change" });
            continue;
          }
          toUpdate.push({ ...item, wishId: existingMatch.id, score, memoText, existingMemo: existingMatch.memo ?? null });
        } else {
          toInsert.push({ ...item, score, memoText });
        }
      }

      const toInsertWithIds = toInsert.map((item) => ({ ...item, id: crypto.randomUUID() as string }));
      const insertedIds = toInsertWithIds.map((item) => item.id);

      try {
        if (toInsertWithIds.length > 0) {
          await insertBatch(supabase, toInsertWithIds.map((item) => ({
            id: item.id,
            group_id: groupId,
            member_id: entry.memberId,
            title: item.row.title,
            situation: "OUTSIDE" as const,
            status: "PENDING" as const,
            memo: item.memoText ?? null,
          })));

          await insertVotesBatch(supabase, toInsertWithIds.map((item) => ({
            wish_id: item.id,
            member_id: entry.memberId,
            score: item.score,
          })));

          const genreLinks: { wish_id: string; genre_id: string }[] = [];
          for (const item of toInsertWithIds) {
            for (const gid of item.genreIds) genreLinks.push({ wish_id: item.id, genre_id: gid });
          }
          if (genreLinks.length > 0) await insertGenresBatch(supabase, genreLinks);
        }

        if (toUpdate.length > 0) {
          const updateWishIds = toUpdate.map((item) => item.wishId);
          const CHUNK = 500;
          // wish_id → 既存スコアのマップ（スコア優先のため score も取得）
          const existingVoteScores = new Map<string, ScoreValue>();
          for (let i = 0; i < updateWishIds.length; i += CHUNK) {
            const { data: votes } = await supabase
              .from("wish_votes").select("wish_id, score")
              .in("wish_id", updateWishIds.slice(i, i + CHUNK))
              .eq("member_id", entry.memberId);
            (votes ?? []).forEach((v: { wish_id: string; score: number }) =>
              existingVoteScores.set(v.wish_id, v.score as ScoreValue));
          }

          for (const item of toUpdate) {
            const mergedMemo = mergeMemos(item.existingMemo, item.memoText);
            const { error } = await supabase.from("wishes")
              .update({ title: item.row.title, memo: mergedMemo }).eq("id", item.wishId);
            if (error) throw error;

            const existingScore = existingVoteScores.get(item.wishId);
            if (existingScore === undefined) {
              // 投票なし → 新規挿入
              const { error: voteErr } = await supabase.from("wish_votes")
                .insert({ wish_id: item.wishId, member_id: entry.memberId, score: item.score });
              if (voteErr) throw voteErr;
            } else if (item.score > existingScore) {
              // CSV側のスコアが高ければ更新
              const { error: voteErr } = await supabase.from("wish_votes")
                .update({ score: item.score })
                .eq("wish_id", item.wishId).eq("member_id", entry.memberId);
              if (voteErr) throw voteErr;
            }

            // ジャンルは常に置き換え（未選択なら全削除）
            await supabase.from("wish_genres").delete().eq("wish_id", item.wishId);
            if (item.genreIds.length > 0) {
              const { error: genreErr } = await supabase.from("wish_genres")
                .insert(item.genreIds.map((gid) => ({ wish_id: item.wishId, genre_id: gid })));
              if (genreErr) throw genreErr;
            }
          }
        }

        const result: ImportResult = {
          inserted: toInsert.length,
          updated: toUpdate.length,
          skipped: skippedItems.length,
          skippedItems,
          insertedItems: toInsert.map((item) => ({ title: item.row.title })),
          updatedItems: toUpdate.map((item) => ({ title: item.row.title })),
        };

        supabase.from("csv_import_logs").insert({
          group_id: groupId,
          member_id: entry.memberId,
          file_names: configs.map((c) => c.file.name),
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          skipped_items: skippedItems,
        }).then(({ error }) => { if (error) console.warn("履歴保存失敗:", error.message); });

        return result;
      } catch (err) {
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

  return { analyzeImport, importFiles };
}
