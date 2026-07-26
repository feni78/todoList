"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Genre, GenreType, GENRE_TYPE_LABELS } from "@/types";
import {
  useCsvGenreAssign,
  GenreFileConfig,
  GenreAssignAnalysis,
  GenreAssignItem,
  FileConflictOption,
  fileNameWithoutExt,
} from "@/hooks/useCsvGenreAssign";
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

// 衝突解決: wishId → 選択中のオプションインデックス or "skip"
type ConflictResolution = number | "skip";

async function countRows(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseCsvText((e.target?.result as string) ?? "").length);
    reader.readAsText(file, "UTF-8");
  });
}

function DetailList({ items, label }: { items: { title: string }[]; label: string }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-muted-foreground hover:bg-muted/50 transition-colors rounded-xl"
      >
        <span>{label}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="border-t border-border">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-1.5 border-b border-border/30 last:border-0 text-xs">
              <p className="break-all">{item.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 min-w-0 text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">未設定</option>
        {options.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
    </div>
  );
}

export function CsvGenreAssignDialog({ open, onClose, groupId, genres, onApplyComplete }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [globalLargeGenreId, setGlobalLargeGenreId] = useState<string | null>(null);
  const [globalMediumGenreId, setGlobalMediumGenreId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [analysis, setAnalysis] = useState<GenreAssignAnalysis | null>(null);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [result, setResult] = useState<{ assigned: number; smallGenresCreated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzeGenreAssign, applyGenreAssign } = useCsvGenreAssign(groupId, genres);

  const largeGenres = genres.filter((g) => g.genreType === "LARGE");
  const mediumGenres = genres.filter((g) => g.genreType === "MEDIUM");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newEntries = await Promise.all(
      files.map(async (file) => ({
        file,
        largeGenreId: globalLargeGenreId,
        mediumGenreId: globalMediumGenreId,
        rowCount: await countRows(file),
      }))
    );
    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name));
      return [...prev, ...newEntries.filter((e) => !existing.has(e.file.name))];
    });
    e.target.value = "";
  };

  const removeEntry = (index: number) => setEntries((prev) => prev.filter((_, i) => i !== index));

  const applyGlobalToAll = () => {
    setEntries((prev) =>
      prev.map((e) => ({ ...e, largeGenreId: globalLargeGenreId, mediumGenreId: globalMediumGenreId }))
    );
  };

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
      // 初期解決策: 各ファイル競合の最初のオプションを選択
      const initResolutions = new Map<string, ConflictResolution>();
      for (const fc of res.fileConflicts) {
        initResolutions.set(fc.wishId, 0);
      }
      setResolutions(initResolutions);
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

  // 適用対象アイテムを構築
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
      const opt: FileConflictOption = fc.options[res as number];
      items.push({
        wishId: fc.wishId,
        wishTitle: fc.wishTitle,
        largeGenreId: opt.largeGenreId,
        mediumGenreId: opt.mediumGenreId,
        smallGenreName: opt.smallGenreName,
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
    setGlobalLargeGenreId(null);
    setGlobalMediumGenreId(null);
    setMode("idle");
    setAnalysis(null);
    setResolutions(new Map());
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

  const genreLabel = (id: string | null, list: Genre[]) =>
    id ? (list.find((g) => g.id === id)?.name ?? "?") : "未設定";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-x-hidden overflow-y-auto">
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
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium">付与プレビュー</p>

            {/* ファイル競合の解決 */}
            {analysis.fileConflicts.length > 0 && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 flex flex-col">
                <div className="flex items-start justify-between gap-2 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
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
                    const res = resolutions.get(fc.wishId) ?? 0;
                    return (
                      <div key={fc.wishId} className="px-4 py-3 border-b border-amber-100 dark:border-amber-900/50 last:border-0">
                        <p className="text-xs font-medium break-all mb-2">{fc.wishTitle}</p>
                        <div className="flex flex-col gap-1.5">
                          {fc.options.map((opt, i) => (
                            <label key={i} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`conflict-${fc.wishId}`}
                                checked={res === i}
                                onChange={() => setResolutions((prev) => new Map(prev).set(fc.wishId, i))}
                                className="shrink-0"
                              />
                              <span className="text-xs text-amber-700 dark:text-amber-300">
                                {fileNameWithoutExt(opt.fileName)}（
                                {genreLabel(opt.largeGenreId, largeGenres)} / {genreLabel(opt.mediumGenreId, mediumGenres)}）
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
                <span className="text-muted-foreground">スキップ（タスク未登録）</span>
                <span className="font-semibold">{analysis.skipItems.length}件</span>
              </div>
            </div>

            <DetailList
              items={analysis.newItems.map((i) => ({ title: i.wishTitle }))}
              label={`新規付与予定の詳細（${analysis.newItems.length}件）`}
            />
            <DetailList
              items={analysis.updateItems.map((i) => ({ title: i.wishTitle }))}
              label={`更新予定の詳細（${analysis.updateItems.length}件）`}
            />
            <DetailList
              items={analysis.conflictItems.map((i) => ({ title: i.wishTitle }))}
              label={`衝突の詳細（${analysis.conflictItems.length}件）`}
            />
            <DetailList
              items={analysis.skipItems}
              label={`スキップ予定の詳細（${analysis.skipItems.length}件）`}
            />

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

            {/* 全ファイル共通設定 */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">全ファイル共通設定</p>
              <div className="flex flex-col gap-1.5">
                <GenreSelect
                  label={GENRE_TYPE_LABELS.LARGE}
                  value={globalLargeGenreId}
                  options={largeGenres}
                  onChange={setGlobalLargeGenreId}
                />
                <GenreSelect
                  label={GENRE_TYPE_LABELS.MEDIUM}
                  value={globalMediumGenreId}
                  options={mediumGenres}
                  onChange={setGlobalMediumGenreId}
                />
              </div>
              {entries.length > 0 && (
                <button
                  type="button"
                  onClick={applyGlobalToAll}
                  className="self-start text-xs text-primary hover:underline"
                >
                  全ファイルに適用
                </button>
              )}
            </div>

            {/* ファイルごとの設定 */}
            {entries.length > 0 && (
              <div className="flex flex-col gap-3">
                {entries.map((entry, i) => (
                  <div key={entry.file.name} className="rounded-xl border border-border p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">{entry.file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
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
                    <div className="text-xs text-muted-foreground">
                      小ジャンル: <span className="font-medium text-foreground">{fileNameWithoutExt(entry.file.name)}</span>
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
