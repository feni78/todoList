"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Genre } from "@/types";
import {
  useCsvImport, FileImportConfig, ImportResult, AnalyzeResult, UpdatePreviewItem, parseCsvText, LocationEnrichResult,
} from "@/hooks/useCsvImport";
import { Upload, X, FileText, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileEntry {
  file: File;
  genreIds: string[];
  rowCount: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  groupId: string;
  genres: Genre[];
}

async function countRows(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseCsvText((e.target?.result as string) ?? "").length);
    reader.readAsText(file, "UTF-8");
  });
}

type Mode = "idle" | "analyzing" | "reviewing" | "importing" | "done";

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
            <div key={i} className="px-4 py-1.5 border-b border-border/30 last:border-0 text-xs w-full min-w-0">
              <p className="break-all">{item.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function UpdateDetailList({ items, label }: { items: UpdatePreviewItem[]; label: string }) {
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
            <div key={i} className="px-4 py-2 border-b border-border/30 last:border-0 text-xs min-w-0">
              <p className="break-all font-medium">{item.title}</p>
              {item.oldTitle !== undefined && (
                <p className="break-all text-muted-foreground">
                  タイトル変更（<span className="line-through">{item.oldTitle}</span> → {item.title}）
                </p>
              )}
              {item.memoAddition !== undefined && (
                <p className="break-all text-muted-foreground">メモ追記（{item.memoAddition}）</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationResultSection({ result }: { result: LocationEnrichResult }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border p-4 flex flex-col gap-2 text-sm">
        <p className="font-medium text-muted-foreground">位置情報取得</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">成功</span>
          <span className="font-semibold">{result.succeeded}件</span>
        </div>
        {result.failed.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">失敗</span>
            <span className="font-semibold text-destructive">{result.failed.length}件</span>
          </div>
        )}
      </div>
      {result.failed.length > 0 && (
        <DetailList
          items={result.failed.map((f) => ({ title: `${f.title}（${f.reason}）` }))}
          label="位置情報取得失敗の詳細を見る"
        />
      )}
    </div>
  );
}

export function CsvImportDialog({ open, onClose, onImportComplete, groupId, genres }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [globalGenreIds, setGlobalGenreIds] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("idle");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzeImport, importFiles } = useCsvImport(groupId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newEntries = await Promise.all(
      files.map(async (file) => ({ file, genreIds: [], rowCount: await countRows(file) }))
    );
    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name));
      return [...prev, ...newEntries.filter((e) => !existing.has(e.file.name))];
    });
    e.target.value = "";
  };

  const removeEntry = (index: number) => setEntries((prev) => prev.filter((_, i) => i !== index));

  const toggleGlobalGenre = (genreId: string) =>
    setGlobalGenreIds((prev) => prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]);

  const toggleGenre = (index: number, genreId: string) =>
    setEntries((prev) => prev.map((entry, i) => {
      if (i !== index) return entry;
      const ids = entry.genreIds.includes(genreId)
        ? entry.genreIds.filter((id) => id !== genreId)
        : [...entry.genreIds, genreId];
      return { ...entry, genreIds: ids };
    }));

  const buildConfigs = (): FileImportConfig[] =>
    entries.map((e) => ({ file: e.file, genreIds: [...new Set([...globalGenreIds, ...e.genreIds])] }));

  const handleAnalyze = async () => {
    setMode("analyzing");
    setError(null);
    try {
      const res = await analyzeImport(buildConfigs());
      setAnalysis(res);
      setMode("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析に失敗しました");
      setMode("idle");
    }
  };

  const handleImport = async (treatSuspiciousAsExisting: boolean) => {
    setMode("importing");
    setError(null);
    try {
      const res = await importFiles(buildConfigs(), treatSuspiciousAsExisting);
      setResult(res);
      setMode("done");
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り込みに失敗しました");
      setMode("reviewing");
    }
  };

  const handleClose = () => {
    setEntries([]);
    setGlobalGenreIds([]);
    setMode("idle");
    setAnalysis(null);
    setResult(null);
    setError(null);
    onClose();
  };

  const totalRows = entries.reduce((sum, e) => sum + (e.rowCount ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV一括取り込み</DialogTitle>
        </DialogHeader>

        {/* 結果画面 */}
        {mode === "done" && result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-base">インポート完了</span>
            </div>
            <div className="rounded-xl border border-border p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">新規</span>
                <span className="font-semibold">{result.inserted}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">更新</span>
                <span className="font-semibold">{result.updated}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">スキップ</span>
                <span className="font-semibold">{result.skipped}件</span>
              </div>
            </div>
            <DetailList items={result.insertedItems} label="新規登録の詳細を見る" />
            <DetailList items={result.updatedItems} label="更新の詳細を見る" />
            <DetailList
              items={result.skippedItems.map((s) => ({ title: `${s.title}（${s.reason === "no_change" ? "変更なし" : "重複"}）` }))}
              label="スキップの詳細を見る"
            />
            {result.locationResult && <LocationResultSection result={result.locationResult} />}
            <Button onClick={handleClose} className="w-full">閉じる</Button>
          </div>
        )}

        {/* プレビュー・確認画面 */}
        {(mode === "reviewing") && analysis && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium">取り込みプレビュー</p>
              <div className="rounded-xl border border-border p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">新規登録予定</span>
                  <span className="font-semibold">{analysis.insertCount}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">更新予定</span>
                  <span className="font-semibold">{analysis.updateCount}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">スキップ予定</span>
                  <span className="font-semibold">{analysis.skipCount}件</span>
                </div>
              </div>

              {analysis.insertCount > 0 && (
                <DetailList
                  items={analysis.insertItems.map((item) => ({
                    title: item.url ? `${item.title}（${item.url}）` : item.title,
                  }))}
                  label={`新規登録予定の詳細（${analysis.insertCount}件）`}
                />
              )}

              {analysis.updateCount > 0 && (
                <UpdateDetailList
                  items={analysis.updateItems}
                  label={`更新予定の詳細（${analysis.updateCount}件）`}
                />
              )}

              {analysis.skipCount > 0 && (
                <DetailList
                  items={analysis.skipItems.map((s) => ({
                    title: `${s.title}（${s.reason === "no_change" ? "変更なし" : "重複"}）`,
                  }))}
                  label={`スキップ予定の詳細（${analysis.skipCount}件）`}
                />
              )}

              {analysis.suspicious.length > 0 && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2 px-4 py-3">
                    <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        要確認: {analysis.suspicious.length}件
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        新規として登録される予定ですが、名前が似た既存データが見つかりました。
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-amber-200 dark:border-amber-800">
                    {analysis.suspicious.map((item, i) => (
                      <div key={i} className="px-4 py-2 border-b border-amber-100 dark:border-amber-900/50 last:border-0 text-xs">
                        <p className="font-medium break-all">{item.title}</p>
                        <p className="text-amber-600 dark:text-amber-400 break-all">
                          既存: 「{item.matchedExistingTitle}」
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            {/* sticky フッター：ボタン */}
            <div className="sticky bottom-0 bg-background flex flex-col gap-2 pt-3 border-t border-border">
              {analysis.suspicious.length > 0 && (
                <Button variant="outline" className="w-full" onClick={() => handleImport(true)}>
                  疑わしいものは既存として扱う
                </Button>
              )}
              <Button className="w-full" onClick={() => handleImport(false)}>
                {analysis.suspicious.length > 0 ? "全て新規として登録" : "実行"}
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
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" multiple className="hidden" onChange={handleFileChange} />

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">全ファイル共通ジャンル</p>
              {genres.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <button key={g.id} type="button" onClick={() => toggleGlobalGenre(g.id)}
                      className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        globalGenreIds.includes(g.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
                      {g.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">設定からジャンルを追加すると選択できます</p>
              )}
            </div>

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
                      <button type="button" onClick={() => removeEntry(i)} className="p-0.5 text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    </div>
                    {genres.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-muted-foreground">ジャンル（このファイル個別）</p>
                        <div className="flex flex-wrap gap-1.5">
                          {genres.map((g) => (
                            <button key={g.id} type="button" onClick={() => toggleGenre(i, g.id)}
                              className={cn("px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                entry.genreIds.includes(g.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}>
                              {g.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center">合計 {totalRows}件</p>
              </div>
            )}

            {totalRows > 2000 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                件数が多いため、取り込みに数分かかる場合があります
              </p>
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

        {/* インポート中 */}
        {mode === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">取り込み中...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
