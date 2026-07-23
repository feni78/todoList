"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScoreValue } from "@/types";
import { getGroupMember } from "@/lib/utils/localStorage";
import { toBroadRegionTag, toSpecificRegionTag, isBroadRegionTag } from "@/lib/utils/regionTag";
import type { PlaceLookupResult } from "@/app/api/places/lookup/route";

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

export interface LocationEnrichResult {
  attempted: number;
  succeeded: number;
  failed: { title: string; reason: string }[];
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  skippedItems: SkippedItem[];
  insertedItems: { title: string }[];
  updatedItems: { title: string }[];
  locationResult?: LocationEnrichResult;
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

// 同一バッチ内で同じ URL またはタイトルを持つ行を事前にマージする
function mergeBatchDuplicates(
  allItems: { row: CsvRow; genreIds: string[] }[]
): { row: CsvRow; genreIds: string[] }[] {
  const order: string[] = [];
  const merged = new Map<string, { row: CsvRow; genreIds: string[] }>();

  for (const item of allItems) {
    if (!item.row.title) continue;
    const key = item.row.url
      ? `url:${normalizeUrl(item.row.url)}`
      : `title:${item.row.title}`;

    if (!merged.has(key)) {
      order.push(key);
      merged.set(key, { row: { ...item.row }, genreIds: [...item.genreIds] });
    } else {
      const prev = merged.get(key)!;
      // buildMemo 済みの文字列でマージし、url は空にして二重追加を防ぐ
      const prevBuilt = buildMemo(prev.row.memo, prev.row.url);
      const newBuilt = buildMemo(item.row.memo, item.row.url);
      prev.row = { ...prev.row, memo: mergeMemos(prevBuilt, newBuilt) ?? "", url: "" };
      // ジャンルはユニオン
      const genreSet = new Set([...prev.genreIds, ...item.genreIds]);
      prev.genreIds = [...genreSet];
    }
  }

  return order.map((k) => merged.get(k)!);
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

async function getOrCreateRegion(
  supabase: ReturnType<typeof createClient>,
  groupId: string,
  name: string,
  cache: Map<string, string>
): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;
  const { data: existing } = await supabase
    .from("regions").select("id").eq("group_id", groupId).eq("name", name).maybeSingle();
  if (existing) { cache.set(name, existing.id as string); return existing.id as string; }
  const { data: created, error } = await supabase
    .from("regions").insert({ group_id: groupId, name }).select("id").single();
  if (error) throw error;
  const id = (created as { id: string }).id;
  cache.set(name, id);
  return id;
}

function isGoogleMapsUrl(url: string): boolean {
  return url.includes("google.com/maps") || url.includes("maps.app.goo.gl");
}

async function enrichWithPlaces(
  supabase: ReturnType<typeof createClient>,
  groupId: string,
  items: { wishId: string; url: string; title: string }[],
  regionCache = new Map<string, string>()
): Promise<LocationEnrichResult> {
  const CONCURRENCY = 3;
  const result: LocationEnrichResult = { attempted: items.length, succeeded: 0, failed: [] };

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ({ wishId, url, title }) => {
      try {
        // すでに座標がある場合はスキップ（カウントしない）
        const { data: existing } = await supabase
          .from("wishes").select("latitude,longitude").eq("id", wishId).single();
        const ex = existing as { latitude: number | null; longitude: number | null } | null;
        if (ex?.latitude != null && ex?.longitude != null) return;

        const resp = await fetch("/api/places/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, name: title }),
        });
        if (!resp.ok) {
          let reason = `HTTP ${resp.status}`;
          try { const e = await resp.json() as { error?: string }; if (e.error) reason = e.error; } catch { /* ignore */ }
          result.failed.push({ title, reason });
          return;
        }

        const place = await resp.json() as PlaceLookupResult;

        // place_id・緯度経度をDBに保存
        await supabase.from("wishes").update({
          place_id: place.placeId,
          latitude: place.latitude,
          longitude: place.longitude,
        }).eq("id", wishId);

        // 地域タグを生成・付与
        if (place.prefecture && place.city) {
          const specificTag = toSpecificRegionTag(place.prefecture, place.city);
          const broadTag = toBroadRegionTag(place.prefecture, place.city);

          const tagNames = [specificTag, broadTag].filter(Boolean);
          const regionIds = await Promise.all(
            tagNames.map((name) => getOrCreateRegion(supabase, groupId, name, regionCache))
          );

          // 重複しないようにupsert
          await supabase.from("wish_regions").upsert(
            regionIds.map((region_id) => ({ wish_id: wishId, region_id })),
            { onConflict: "wish_id,region_id", ignoreDuplicates: true }
          );
        }

        result.succeeded++;
      } catch (err) {
        result.failed.push({ title, reason: err instanceof Error ? err.message : "不明なエラー" });
      }
    }));
  }

  return result;
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

interface ExistingWish { id: string; title: string; memo: string | null; genreIds: string[]; url: string | null; }

interface ExistingMaps {
  urlToExisting: Map<string, ExistingWish>;
  titleToExisting: Map<string, ExistingWish>;
  titleToExistingCI: Map<string, ExistingWish>; // case-insensitive
}

async function fetchExisting(supabase: ReturnType<typeof createClient>, groupId: string): Promise<ExistingMaps> {
  // サーバー側 max_rows 制限を回避するためページネーション取得
  const PAGE = 1000;
  let allRows: { id: string; title: string; memo: string | null; wish_genres: { genre_id: string }[] }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wishes")
      .select("id, title, memo, wish_genres(genre_id)")
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    allRows = allRows.concat((data ?? []) as typeof allRows);
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }

  const urlToExisting = new Map<string, ExistingWish>();
  const titleToExisting = new Map<string, ExistingWish>();
  const titleToExistingCI = new Map<string, ExistingWish>();

  for (const w of allRows) {
    const genreIds = (w.wish_genres ?? []).map((g) => g.genre_id).sort();
    let existingUrl: string | null = null;
    if (w.memo) {
      const lines = w.memo.split("\n");
      const lastLine = lines[lines.length - 1].trim();
      if (/^https?:\/\//.test(lastLine)) existingUrl = normalizeUrl(lastLine);
    }
    const existing: ExistingWish = { id: w.id, title: w.title, memo: w.memo, genreIds, url: existingUrl };
    if (existingUrl) urlToExisting.set(existingUrl, existing);
    if (w.title) {
      titleToExisting.set(w.title, existing);
      titleToExistingCI.set(w.title.toLowerCase(), existing);
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

async function reverseGeocodeRegions(
  supabase: ReturnType<typeof createClient>,
  groupId: string,
  items: { wishId: string; title: string; lat: number; lng: number }[],
  regionCache: Map<string, string>,
  result: LocationEnrichResult
): Promise<void> {
  const CONCURRENCY = 3;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ({ wishId, title, lat, lng }) => {
      try {
        const resp = await fetch("/api/geocode/reverse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({})) as { error?: string };
          result.failed.push({ title, reason: e.error ?? `HTTP ${resp.status}` });
          return;
        }
        const { prefecture, city } = await resp.json() as { prefecture: string | null; city: string | null };
        if (prefecture && city) {
          const tagNames = [toSpecificRegionTag(prefecture, city), toBroadRegionTag(prefecture, city)].filter(Boolean);
          const regionIds = await Promise.all(
            tagNames.map((name) => getOrCreateRegion(supabase, groupId, name, regionCache))
          );
          await supabase.from("wish_regions").upsert(
            regionIds.map((region_id) => ({ wish_id: wishId, region_id })),
            { onConflict: "wish_id,region_id", ignoreDuplicates: true }
          );
        }
        result.succeeded++;
      } catch (err) {
        result.failed.push({ title, reason: err instanceof Error ? err.message : "不明なエラー" });
      }
    }));
  }
}

async function retryLocationEnrichmentImpl(
  supabase: ReturnType<typeof createClient>,
  groupId: string
): Promise<LocationEnrichResult | null> {
  const PAGE = 200;
  const regionCache = new Map<string, string>();

  // Phase 1: 緯度経度なし → Google Maps URL があれば Places API で取得
  let phase1Rows: { id: string; title: string; memo: string | null }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wishes")
      .select("id, title, memo")
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .or("latitude.is.null,longitude.is.null")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    phase1Rows = phase1Rows.concat((data ?? []) as typeof phase1Rows);
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }

  const phase1Items: { wishId: string; url: string; title: string }[] = [];
  for (const row of phase1Rows) {
    if (!row.memo) continue;
    const urls = row.memo.match(/https?:\/\/[^\s]+/g) ?? [];
    const googleUrl = urls.find((u) => isGoogleMapsUrl(u));
    if (googleUrl) phase1Items.push({ wishId: row.id, url: googleUrl, title: row.title });
  }

  // Phase 2: 緯度経度あり・地域タグ未設定 → Geocoding API でリバースジオコーディング
  // Step 1: 緯度経度が揃っているもの全件取得
  let phase2Candidates: { id: string; title: string; latitude: number; longitude: number }[] = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wishes")
      .select("id, title, latitude, longitude")
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as typeof phase2Candidates;
    phase2Candidates = phase2Candidates.concat(rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  // Step 2: 中地域・小地域の両方が揃っているものを除外（どちらか欠けていれば対象）
  let phase2Items: { wishId: string; title: string; lat: number; lng: number }[] = [];
  if (phase2Candidates.length > 0) {
    const candidateIds = phase2Candidates.map((r) => r.id);
    const { data: taggedData } = await supabase
      .from("wish_regions")
      .select("wish_id, regions(name)")
      .in("wish_id", candidateIds);
    // wish_id ごとに 中地域あり・小地域あり をまとめる
    const hasBroad = new Set<string>();
    const hasSpecific = new Set<string>();
    for (const row of (taggedData ?? []) as unknown as { wish_id: string; regions: { name: string } | null }[]) {
      if (!row.regions) continue;
      if (isBroadRegionTag(row.regions.name)) hasBroad.add(row.wish_id);
      else hasSpecific.add(row.wish_id);
    }
    phase2Items = phase2Candidates
      .filter((r) => !hasBroad.has(r.id) || !hasSpecific.has(r.id))
      .map((r) => ({ wishId: r.id, title: r.title, lat: r.latitude, lng: r.longitude }));
  }

  if (phase1Items.length === 0 && phase2Items.length === 0) return null;

  const result: LocationEnrichResult = { attempted: phase1Items.length + phase2Items.length, succeeded: 0, failed: [] };

  if (phase1Items.length > 0) {
    const p1 = await enrichWithPlaces(supabase, groupId, phase1Items, regionCache);
    result.succeeded += p1.succeeded;
    result.failed.push(...p1.failed);
  }

  if (phase2Items.length > 0) {
    await reverseGeocodeRegions(supabase, groupId, phase2Items, regionCache, result);
  }

  return result;
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

    const dedupedItems = mergeBatchDuplicates(allItems);

    for (const { row, genreIds } of dedupedItems) {
      if (!row.title) continue;

      const memoText = buildMemo(row.memo, row.url);
      const matchByUrl = row.url ? urlToExisting.get(normalizeUrl(row.url)) : undefined;
      let matchByTitle = !matchByUrl ? titleToExisting.get(row.title) : undefined;
      if (matchByTitle) {
        const newUrl = row.url ? normalizeUrl(row.url) : null;
        if (matchByTitle.url && newUrl && matchByTitle.url !== newUrl) matchByTitle = undefined;
      }
      const existingMatch = matchByUrl ?? matchByTitle;

      if (existingMatch) {
        const newMemo = memoText ?? null;
        const titleChanged = existingMatch.title !== row.title;
        const memoWillChange = memoWouldChange(existingMatch.memo, newMemo);
        const sortedNew = [...genreIds].sort();
        // genreIds が空のときはジャンル未指定扱い（既存を変更しない）
        const genreChanged = genreIds.length > 0 && JSON.stringify(sortedNew) !== JSON.stringify(existingMatch.genreIds);
        if (!titleChanged && !memoWillChange && !genreChanged) {
          skipItems.push({ title: row.title, reason: "no_change" });
          skipCount++;
        } else {
          const changes: string[] = [];
          if (titleChanged) changes.push("タイトル変更");
          if (memoWillChange) changes.push("メモ追記");
          if (genreChanged) changes.push("ジャンル変更");
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

      const dedupedItems = mergeBatchDuplicates(allItems);

      for (const item of dedupedItems) {
        const { row } = item;
        if (!row.title) continue;

        const score = scoreFromMemo(row.memo);
        const memoText = buildMemo(row.memo, row.url);

        const matchByUrl = row.url ? urlToExisting.get(normalizeUrl(row.url)) : undefined;
        let matchByTitle = !matchByUrl ? titleToExisting.get(row.title) : undefined;
        if (matchByTitle) {
          const newUrl = row.url ? normalizeUrl(row.url) : null;
          if (matchByTitle.url && newUrl && matchByTitle.url !== newUrl) matchByTitle = undefined;
        }
        // 要確認アイテムを既存として扱うモード：大文字小文字違いも一致とみなす
        if (!matchByUrl && !matchByTitle && treatSuspiciousAsExisting) {
          matchByTitle = titleToExistingCI.get(row.title.toLowerCase());
        }
        const existingMatch = matchByUrl ?? matchByTitle;

        if (existingMatch) {
          const newMemo = memoText ?? null;
          const titleChanged = existingMatch.title !== row.title;
          const memoWillChange = memoWouldChange(existingMatch.memo, newMemo);
          const sortedNew = [...item.genreIds].sort();
          const genreChanged = item.genreIds.length > 0 && JSON.stringify(sortedNew) !== JSON.stringify(existingMatch.genreIds);
          if (!titleChanged && !memoWillChange && !genreChanged) {
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

            // genreIds が指定されている場合のみ置き換え
            if (item.genreIds.length > 0) {
              await supabase.from("wish_genres").delete().eq("wish_id", item.wishId);
              const { error: genreErr } = await supabase.from("wish_genres")
                .insert(item.genreIds.map((gid) => ({ wish_id: item.wishId, genre_id: gid })));
              if (genreErr) throw genreErr;
            }
          }
        }

        // Places API: URLのある行にplace_id・緯度経度・地域タグを付与
        const urlItems = [
          ...toInsertWithIds.filter((i) => i.row.url && isGoogleMapsUrl(i.row.url)),
          ...toUpdate.filter((i) => i.row.url && isGoogleMapsUrl(i.row.url)),
        ];
        let locationResult: LocationEnrichResult | undefined;
        if (urlItems.length > 0) {
          locationResult = await enrichWithPlaces(supabase, groupId, urlItems.map((i) => ({
            wishId: "id" in i ? (i as typeof toInsertWithIds[0]).id : (i as typeof toUpdate[0]).wishId,
            url: i.row.url,
            title: i.row.title,
          })));
        }

        const result: ImportResult = {
          inserted: toInsert.length,
          updated: toUpdate.length,
          skipped: skippedItems.length,
          skippedItems,
          insertedItems: toInsert.map((item) => ({ title: item.row.title })),
          updatedItems: toUpdate.map((item) => ({ title: item.row.title })),
          locationResult,
        };

        supabase.from("csv_import_logs").insert({
          group_id: groupId,
          member_id: entry.memberId,
          file_names: configs.map((c) => c.file.name),
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          skipped_items: skippedItems,
          inserted_items: result.insertedItems,
          updated_items: result.updatedItems,
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

  const retryLocationEnrichment = useCallback(async (): Promise<LocationEnrichResult | null> => {
    const supabase = createClient();
    return retryLocationEnrichmentImpl(supabase, groupId);
  }, [groupId]);

  return { analyzeImport, importFiles, retryLocationEnrichment };
}
