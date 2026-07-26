"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Genre, GENRE_TYPE_LABELS } from "@/types";
import {
  useCsvGenreAssign,
  GenreFileConfig,
  GenreAssignAnalysis,
  GenreAssignItem,
  FileConflictOption,
  FuzzySkipItem,
  FilePreset,
  fileNameWithoutExt,
} from "@/hooks/useCsvGenreAssign";
import type { FileConflictWarn } from "@/hooks/useCsvGenreAssign";
import { parseCsvText } from "@/hooks/useCsvImport";
import { Upload, X, FileText, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileEntry {
  file: File;
  largeGenreId: string | null;
  mediumGenreId: string | null;
  rowCount: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  genres: Genre[];
  onApplyComplete?: () => void;
}

type Mode = "idle" | "analyzing" | "preview" | "applying" | "done";
type ConflictResolution = "both" | number | "skip";
type FuzzyResolution = string | "skip"; // wishId or "skip"

async function countRows(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseCsvText((e.target?.result as string) ?? "").length);
    reader.readAsText(file, "UTF-8");
  });
}

function GenreSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Genre[];
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-muted-foreground shrink-0 w-16">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 min-w-0 w-0 text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">未設定</option>
        {options.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
    </div>
  );
}

// プレビュー詳細行
function AssignDetailRow({
  item,
  genres,
  badge,
  badgeClass,
}: {
  item: GenreAssignItem;
  genres: Genre[];
  badge: string;
  badgeClass: string;
}) {
  const genreName = (id: string | null) => id ? (genres.find((g) => g.id === id)?.name ?? "?") : null;
  const largeName = genreName(item.largeGenreId);
  const mediumName = genreName(item.mediumGenreId);

  const existingLargeNames = (item.existingGenreIds ?? [])
    .filter((id) => genres.find((g) => g.id === id)?.genreType === "LARGE")
    .map((id) => genres.find((g) => g.id === id)?.name ?? "?");
  const existingMediumNames = (item.existingGenreIds ?? [])
    .filter((id) => genres.find((g) => g.id === id)?.genreType === "MEDIUM")
    .map((id) => genres.find((g) => g.id === id)?.name ?? "?");

  const parts: string[] = [];
  if (largeName) parts.push(`大: ${largeName}`);
  if (mediumName) parts.push(`中: ${mediumName}`);
  if (item.smallGenreName) parts.push(`小: ${item.smallGenreName}`);

  const existingParts: string[] = [];
  if (existingLargeNames.length) existingParts.push(`大: ${existingLargeNames.join("・")}`);
  if (existingMediumNames.length) existingParts.push(`中: ${existingMediumNames.join("・")}`);

  return (
    <div className="px-3 py-2 border-b border-border/30 last:border-0 flex gap-2 items-start min-w-0">
      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5", badgeClass)}>{badge}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium break-all">{item.wishTitle}</p>
        {existingParts.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            既存: {existingParts.join(" / ")}
            {parts.length > 0 && " →"}
          </p>
        )}
        {parts.length > 0 && (
          <p className="text-[10px] text-primary mt-0.5">付与: {parts.join(" / ")}</p>
        )}
      </div>
    </div>
  );
}

function DetailSection({
  items,
  label,
  genres,
  badge,
  badgeClass,
}: {
  items: GenreAssignItem[];
  label: string;
  genres: Genre[];
  badge: string;
  badgeClass: string;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border text-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-muted-foreground hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-sm">{label}</span>
        {open ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border">
          {items.map((item) => (
            <AssignDetailRow key={item.wishId} item={item} genres={genres} badge={badge} badgeClass={badgeClass} />
          ))}
        </div>
      )}
    </div>
  );
}

function FuzzySkipSection({
  items,
  resolutions,
  onChange,
}: {
  items: FuzzySkipItem[];
  resolutions: Map<string, FuzzyResolution>;
  onChange: (csvTitle: string, wishId: FuzzyResolution) => void;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const matchedCount = items.filter((fi) => resolutions.get(fi.csvTitle) !== "skip").length;
  return (
    <div className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            部分一致候補（要確認） {items.length}件
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            CSVのタイトルとは異なるが類似するタスクが見つかりました
            {matchedCount > 0 && `・${matchedCount}件マッチ済み`}
          </p>
        </div>
        {open ? <ChevronUp size={15} className="shrink-0 text-blue-600" /> : <ChevronDown size={15} className="shrink-0 text-blue-600" />}
      </button>
      {open && (
        <div className="border-t border-blue-200 dark:border-blue-800 flex flex-col">
          {items.map((fi) => {
            const res = resolutions.get(fi.csvTitle) ?? "skip";
            return (
              <div key={fi.csvTitle} className="px-4 py-3 border-b border-blue-100 dark:border-blue-900/50 last:border-0">
                <p className="text-xs text-muted-foreground mb-1">CSVタイトル</p>
                <p className="text-xs font-medium break-all mb-2">{fi.csvTitle}</p>
                <div className="flex flex-col gap-1.5">
                  {fi.candidates.map((cand) => (
                    <label key={cand.wishId} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`fuzzy-${fi.csvTitle}`}
                        checked={res === cand.wishId}
                        onChange={() => onChange(fi.csvTitle, cand.wishId)}
                        className="shrink-0 mt-0.5"
                      />
                      <span className="text-xs text-blue-700 dark:text-blue-300 break-all">{cand.wishTitle}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`fuzzy-${fi.csvTitle}`}
                      checked={res === "skip"}
                      onChange={() => onChange(fi.csvTitle, "skip")}
                      className="shrink-0"
                    />
                    <span className="text-xs text-muted-foreground">スキップ</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkipDetailSection({ items }: { items: { title: string }[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border text-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-muted-foreground hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-sm">スキップの詳細（{items.length}件）</span>
        {open ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border">
          {items.map((item, i) => (
            <div key={i} className="px-3 py-2 border-b border-border/30 last:border-0">
              <p className="text-xs break-all">{item.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CsvGenreAssignDialog({ open, onClose, groupId, genres, onApplyComplete }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [presets, setPresets] = useState<Record<string, FilePreset>>({});
  const [mode, setMode] = useState<Mode>("idle");
  const [analysis, setAnalysis] = useState<GenreAssignAnalysis | null>(null);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [fuzzyResolutions, setFuzzyResolutions] = useState<Map<string, FuzzyResolution>>(new Map());
  const [result, setResult] = useState<{ assigned: number; smallGenresCreated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzeGenreAssign, applyGenreAssign, fetchPresets, savePresets } = useCsvGenreAssign(groupId, genres);

  useEffect(() => {
    if (!open) return;
    fetchPresets().then(setPresets);
  }, [open, fetchPresets]);

  const largeGenres = genres.filter((g) => g.genreType === "LARGE");
  const mediumGenres = genres.filter((g) => g.genreType === "MEDIUM");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newEntries = await Promise.all(
      files.map(async (file) => {
        const saved = presets[file.name];
        return {
          file,
          largeGenreId: saved?.largeGenreId ?? null,
          mediumGenreId: saved?.mediumGenreId ?? null,
          rowCount: await countRows(file),
        };
      })
    );
    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name));
      return [...prev, ...newEntries.filter((e) => !existing.has(e.file.name))];
    });
    e.target.value = "";
  };

  const removeEntry = (index: number) => setEntries((prev) => prev.filter((_, i) => i !== index));

  const buildConfigs = (): GenreFileConfig[] =>
    entries.map((e) => ({
      file: e.file,
      largeGenreId: e.largeGenreId,
      mediumGenreId: e.mediumGenreId,
    }));

  const handleAnalyze = async () => {
    setMode("analyzing");
    setError(null);
    try {
      const res = await analyzeGenreAssign(buildConfigs());
      setAnalysis(res);
      const initResolutions = new Map<string, ConflictResolution>();
      for (const fc of res.fileConflicts) initResolutions.set(fc.wishId, "both");
      setResolutions(initResolutions);
      const initFuzzy = new Map<string, FuzzyResolution>();
      for (const fi of res.fuzzySkipItems) initFuzzy.set(fi.csvTitle, "skip");
      setFuzzyResolutions(initFuzzy);
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析に失敗しました");
      setMode("idle");
    }
  };

  const skipAllConflicts = () => {
    if (!analysis) return;
    const next = new Map(resolutions);
    for (const fc of analysis.fileConflicts) next.set(fc.wishId, "skip");
    setResolutions(next);
  };

  const buildAssignments = (): GenreAssignItem[] => {
    if (!analysis) return [];
    const items: GenreAssignItem[] = [
      ...analysis.newItems,
      ...analysis.updateItems,
      ...analysis.conflictItems,
    ];
    for (const fc of analysis.fileConflicts) {
      const res = resolutions.get(fc.wishId);
      if (res === "skip" || res === undefined) continue;
      if (res === "both") {
        for (const opt of fc.options) {
          items.push({
            wishId: fc.wishId,
            wishTitle: fc.wishTitle,
            largeGenreId: opt.largeGenreId,
            mediumGenreId: opt.mediumGenreId,
            smallGenreName: opt.smallGenreName,
          });
        }
      } else {
        const opt: FileConflictOption = fc.options[res as number];
        items.push({
          wishId: fc.wishId,
          wishTitle: fc.wishTitle,
          largeGenreId: opt.largeGenreId,
          mediumGenreId: opt.mediumGenreId,
          smallGenreName: opt.smallGenreName,
        });
      }
    }
    for (const fi of analysis.fuzzySkipItems) {
      const resolved = fuzzyResolutions.get(fi.csvTitle);
      if (!resolved || resolved === "skip") continue;
      const cand = fi.candidates.find((c) => c.wishId === resolved);
      if (!cand) continue;
      items.push({
        wishId: resolved,
        wishTitle: cand.wishTitle,
        largeGenreId: fi.largeGenreId,
        mediumGenreId: fi.mediumGenreId,
        smallGenreName: fi.smallGenreName,
      });
    }
    return items;
  };

  const handleApply = async () => {
    setMode("applying");
    setError(null);
    try {
      const assignments = buildAssignments();
      const res = await applyGenreAssign(assignments);
      // 使用したジャンル設定をファイル名ごとにDB保存
      const presetUpdates: Record<string, FilePreset> = {};
      for (const entry of entries) {
        presetUpdates[entry.file.name] = {
          largeGenreId: entry.largeGenreId,
          mediumGenreId: entry.mediumGenreId,
        };
      }
      await savePresets(presetUpdates);
      setResult(res);
      setMode("done");
      onApplyComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "付与に失敗しました");
      setMode("preview");
    }
  };

  const handleClose = () => {
    setEntries([]);
    setPresets({});
    setMode("idle");
    setAnalysis(null);
    setResolutions(new Map());
    setFuzzyResolutions(new Map());
    setResult(null);
    setError(null);
    onClose();
  };

  const totalRows = entries.reduce((sum, e) => sum + (e.rowCount ?? 0), 0);
  const resolvedFileConflictCount = analysis
    ? analysis.fileConflicts.filter((fc) => resolutions.get(fc.wishId) !== "skip").length
    : 0;
  const skippedFileConflictCount = analysis
    ? analysis.fileConflicts.filter((fc) => resolutions.get(fc.wishId) === "skip").length
    : 0;

  const optionLabel = (opt: FileConflictOption) => {
    const large = genreLabel(opt.largeGenreId, largeGenres);
    const medium = genreLabel(opt.mediumGenreId, mediumGenres);
    return `${fileNameWithoutExt(opt.fileName)}（大: ${large} / 中: ${medium} / 小: ${opt.smallGenreName}）`;
  };

  const genreLabel = (id: string | null, list: Genre[]) =>
    id ? (list.find((g) => g.id === id)?.name ?? "?") : "未設定";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl w-full max-h-[90vh] overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
        <DialogHeader>
          <DialogTitle>CSVジャンル付与</DialogTitle>
        </DialogHeader>

        {/* 完了画面 */}
        {mode === "done" && result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-base">ジャンル付与完了</span>
            </div>
            <div className="rounded-xl border border-border p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">付与済み</span>
                <span className="font-semibold">{result.assigned}件</span>
              </div>
              {result.smallGenresCreated > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">小ジャンル新規作成</span>
                  <span className="font-semibold">{result.smallGenresCreated}件</span>
                </div>
              )}
            </div>
            <Button onClick={handleClose} className="w-full">閉じる</Button>
          </div>
        )}

        {/* プレビュー画面 */}
        {mode === "preview" && analysis && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">付与プレビュー</p>

            {/* ファイル競合の解決 */}
            {analysis.fileConflicts.length > 0 && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 flex flex-col overflow-hidden">
                <div className="flex items-start justify-between gap-2 px-4 py-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        ファイル間の競合 {analysis.fileConflicts.length}件
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        同一タスクが複数ファイルに存在し、大/中ジャンルの設定が異なります
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={skipAllConflicts}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                  >
                    全てスキップ
                  </button>
                </div>
                <div className="border-t border-amber-200 dark:border-amber-800 flex flex-col">
                  {analysis.fileConflicts.map((fc) => {
                    const res = resolutions.get(fc.wishId) ?? "both";
                    return (
                      <div key={fc.wishId} className="px-4 py-3 border-b border-amber-100 dark:border-amber-900/50 last:border-0">
                        <p className="text-xs font-medium break-all mb-2">{fc.wishTitle}</p>
                        <div className="flex flex-col gap-1.5">
                          {/* 両方を登録（デフォルト） */}
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`conflict-${fc.wishId}`}
                              checked={res === "both"}
                              onChange={() => setResolutions((prev) => new Map(prev).set(fc.wishId, "both"))}
                              className="shrink-0 mt-0.5"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">両方を登録（推奨）</span>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {fc.options.map((opt, i) => (
                                  <span key={i} className="text-[10px] text-amber-600 dark:text-amber-400 break-all">
                                    · {optionLabel(opt)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </label>
                          {/* 個別選択 */}
                          {fc.options.map((opt, i) => (
                            <label key={i} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`conflict-${fc.wishId}`}
                                checked={res === i}
                                onChange={() => setResolutions((prev) => new Map(prev).set(fc.wishId, i))}
                                className="shrink-0"
                              />
                              <span className="text-xs text-amber-700 dark:text-amber-300 break-all">
                                {optionLabel(opt)}のみ
                              </span>
                            </label>
                          ))}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`conflict-${fc.wishId}`}
                              checked={res === "skip"}
                              onChange={() => setResolutions((prev) => new Map(prev).set(fc.wishId, "skip"))}
                              className="shrink-0"
                            />
                            <span className="text-xs text-muted-foreground">このタスクをスキップ</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ファイル衝突警告 */}
            {analysis.fileConflictWarns.length > 0 && (
              <div className="rounded-xl border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 px-4 py-3 flex flex-col gap-1">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0" />
                  ジャンル設定が大幅に変わるファイルがあります
                </p>
                {analysis.fileConflictWarns.map((w) => (
                  <p key={w.fileName} className="text-xs text-orange-600 dark:text-orange-400">
                    · {fileNameWithoutExt(w.fileName)}：マッチ {w.totalMatched}件中 {w.conflictCount}件が衝突（
                    {Math.round((w.conflictCount / w.totalMatched) * 100)}%）
                  </p>
                ))}
              </div>
            )}

            {/* 件数サマリー */}
            <div className="rounded-xl border border-border p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">新規付与予定</span>
                <span className="font-semibold">{analysis.newItems.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">更新予定</span>
                <span className="font-semibold">{analysis.updateItems.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">衝突（追加付与予定）</span>
                <span className="font-semibold">{analysis.conflictItems.length}件</span>
              </div>
              {analysis.fileConflicts.length > 0 && (
                <>
                  {resolvedFileConflictCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">競合解決済み（付与予定）</span>
                      <span className="font-semibold">{resolvedFileConflictCount}件</span>
                    </div>
                  )}
                  {skippedFileConflictCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">競合スキップ</span>
                      <span className="font-semibold">{skippedFileConflictCount}件</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">付与済み（変更なし）</span>
                <span className="font-semibold">{analysis.alreadyItems.length}件</span>
              </div>
              {analysis.fuzzySkipItems.length > 0 && (() => {
                const matched = analysis.fuzzySkipItems.filter(
                  (fi) => fuzzyResolutions.get(fi.csvTitle) !== "skip"
                ).length;
                const skipped = analysis.fuzzySkipItems.length - matched;
                return (
                  <>
                    {matched > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">部分一致マッチ（付与予定）</span>
                        <span className="font-semibold">{matched}件</span>
                      </div>
                    )}
                    {skipped > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">部分一致スキップ</span>
                        <span className="font-semibold">{skipped}件</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-between">
                <span className="text-muted-foreground">スキップ（タスク未登録）</span>
                <span className="font-semibold">{analysis.skipItems.length}件</span>
              </div>
            </div>

            <DetailSection
              items={analysis.newItems}
              label={`新規付与の詳細（${analysis.newItems.length}件）`}
              genres={genres}
              badge="新規"
              badgeClass="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
            />
            <DetailSection
              items={analysis.updateItems}
              label={`更新の詳細（${analysis.updateItems.length}件）`}
              genres={genres}
              badge="更新"
              badgeClass="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
            />
            <DetailSection
              items={analysis.conflictItems}
              label={`衝突の詳細（${analysis.conflictItems.length}件）`}
              genres={genres}
              badge="衝突"
              badgeClass="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
            />
            <DetailSection
              items={analysis.alreadyItems}
              label={`付与済みの詳細（${analysis.alreadyItems.length}件）`}
              genres={genres}
              badge="済"
              badgeClass="bg-muted text-muted-foreground"
            />
            {analysis.fuzzySkipItems.length > 0 && (
              <FuzzySkipSection
                items={analysis.fuzzySkipItems}
                resolutions={fuzzyResolutions}
                onChange={(csvTitle, wishId) =>
                  setFuzzyResolutions((prev) => new Map(prev).set(csvTitle, wishId))
                }
              />
            )}
            <SkipDetailSection items={analysis.skipItems} />

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="sticky bottom-0 bg-background flex flex-col gap-2 pt-3 border-t border-border">
              <Button
                className="w-full"
                onClick={handleApply}
                disabled={buildAssignments().length === 0}
              >
                適用（{buildAssignments().length}件）
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setMode("idle")}>
                戻る
              </Button>
            </div>
          </div>
        )}

        {/* ファイル選択画面 */}
        {(mode === "idle" || mode === "analyzing") && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-6 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload size={24} />
              <span className="text-sm font-medium">CSVファイルを選択（複数可）</span>
              <span className="text-xs">UTF-8形式のCSVをお使いください</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {/* ファイルごとの設定 */}
            {entries.length > 0 && (
              <div className="flex flex-col gap-3">
                {entries.map((entry, i) => (
                  <div key={entry.file.name} className="rounded-xl border border-border p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText size={15} className="text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{entry.file.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {entry.rowCount != null ? `${entry.rowCount}件` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEntry(i)}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      小ジャンル: <span className="font-medium text-foreground break-all">{fileNameWithoutExt(entry.file.name)}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <GenreSelect
                        label={GENRE_TYPE_LABELS.LARGE}
                        value={entry.largeGenreId}
                        options={largeGenres}
                        onChange={(id) =>
                          setEntries((prev) =>
                            prev.map((e, idx) => (idx === i ? { ...e, largeGenreId: id } : e))
                          )
                        }
                      />
                      <GenreSelect
                        label={GENRE_TYPE_LABELS.MEDIUM}
                        value={entry.mediumGenreId}
                        options={mediumGenres}
                        onChange={(id) =>
                          setEntries((prev) =>
                            prev.map((e, idx) => (idx === i ? { ...e, mediumGenreId: id } : e))
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center">合計 {totalRows}件</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose} disabled={mode === "analyzing"}>
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleAnalyze}
                disabled={entries.length === 0 || mode === "analyzing"}
              >
                {mode === "analyzing" ? "分析中..." : "プレビュー"}
              </Button>
            </div>
          </div>
        )}

        {/* 適用中 */}
        {mode === "applying" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">付与中...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
