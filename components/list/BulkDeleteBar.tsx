"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkDeleteBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}

export function BulkDeleteBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearAll,
  onDelete,
  onCancel,
}: BulkDeleteBarProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (selectedCount === 0) return;
    if (!confirm(`${selectedCount}件のタスクを削除します。この操作は取り消せません。`)) return;
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border shadow-lg px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium flex-1">{selectedCount}件選択中</span>
        <button onClick={onSelectAll} className="text-xs text-primary hover:underline">
          全選択（{totalCount}件）
        </button>
        <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground">
          解除
        </button>
        <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <Button
        variant="destructive"
        disabled={selectedCount === 0 || loading}
        onClick={handleDelete}
      >
        {loading ? "削除中..." : `${selectedCount}件を削除`}
      </Button>
    </div>
  );
}
