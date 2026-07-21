"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Genre, Wish } from "@/types";
import { useCsvImport, FileImportConfig, ImportResult, parseCsvText } from "@/hooks/useCsvImport";
import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileEntry {
  file: File;
  genreIds: string[];
  rowCount: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  genres: Genre[];
  wishes: Wish[];
}

async function countRows(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      resolve(parseCsvText(text).length);
    };
    reader.readAsText(file, "UTF-8");
  });
}

export function CsvImportDialog({ open, onClose, groupId, genres, wishes }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { importFiles } = useCsvImport(groupId, wishes);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newEntries = await Promise.all(
      files.map(async (file) => ({
        file,
        genreIds: [],
        rowCount: await countRows(file),
      }))
    );

    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name));
      return [...prev, ...newEntries.filter((e) => !existing.has(e.file.name))];
    });

    // reset input so same file can be re-added after removal
    e.target.value = "";
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleGenre = (index: number, genreId: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const ids = entry.genreIds.includes(genreId)
          ? entry.genreIds.filter((id) => id !== genreId)
          : [...entry.genreIds, genreId];
        return { ...entry, genreIds: ids };
      })
    );
  };

  const handleImport = async () => {
    if (entries.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const configs: FileImportConfig[] = entries.map((e) => ({
        file: e.file,
        genreIds: e.genreIds,
      }));
      const res = await importFiles(configs);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り込みに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setEntries([]);
    setResult(null);
    setError(null);
    onClose();
  };

  const totalRows = entries.reduce((sum, e) => sum + (e.rowCount ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV一括取り込み</DialogTitle>
        </DialogHeader>

        {result ? (
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
            <Button onClick={handleClose} className="w-full">閉じる</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* File picker */}
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

            {/* File list */}
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

                    {genres.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-muted-foreground">ジャンル（このファイル全体に適用）</p>
                        <div className="flex flex-wrap gap-1.5">
                          {genres.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => toggleGenre(i, g.id)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                entry.genreIds.includes(g.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/70"
                              )}
                            >
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

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose} disabled={importing}>
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
                disabled={entries.length === 0 || importing}
              >
                {importing ? "取り込み中..." : "取り込み開始"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
