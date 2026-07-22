"use client";

import { useState } from "react";
import { Genre } from "@/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkGenreBarProps {
  selectedCount: number;
  totalCount: number;
  genres: Genre[];
  onSelectAll: () => void;
  onClearAll: () => void;
  onApply: (genreIds: string[], mode: "add" | "remove") => Promise<void>;
  onCancel: () => void;
}

export function BulkGenreBar({
  selectedCount,
  totalCount,
  genres,
  onSelectAll,
  onClearAll,
  onApply,
  onCancel,
}: BulkGenreBarProps) {
  const [pickedGenreIds, setPickedGenreIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleGenre = (id: string) =>
    setPickedGenreIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );

  const handleApply = async (mode: "add" | "remove") => {
    if (pickedGenreIds.length === 0 || selectedCount === 0) return;
    setLoading(true);
    try {
      await onApply(pickedGenreIds, mode);
    } finally {
      setLoading(false);
    }
  };

  const canApply = pickedGenreIds.length > 0 && selectedCount > 0 && !loading;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border shadow-lg px-4 py-3 flex flex-col gap-3">
      {/* ヘッダー行 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium flex-1">
          {selectedCount}件選択中
        </span>
        <button
          onClick={onSelectAll}
          className="text-xs text-primary hover:underline"
        >
          全選択（{totalCount}件）
        </button>
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          解除
        </button>
        <button
          onClick={onCancel}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* ジャンル選択 */}
      {genres.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => toggleGenre(g.id)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                pickedGenreIds.includes(g.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">ジャンルが未登録です（設定から追加できます）</p>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={!canApply}
          onClick={() => handleApply("remove")}
        >
          {loading ? "処理中..." : "削除"}
        </Button>
        <Button
          className="flex-1"
          disabled={!canApply}
          onClick={() => handleApply("add")}
        >
          {loading ? "処理中..." : "追加"}
        </Button>
      </div>
    </div>
  );
}
