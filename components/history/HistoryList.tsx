"use client";

import { useState } from "react";
import { WishHistory } from "@/types";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HistoryForm } from "./HistoryForm";

interface HistoryListProps {
  histories: WishHistory[];
  onUpdate: (id: string, data: { doneAt: string; comment?: string }) => Promise<void>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function HistoryList({ histories, onUpdate }: HistoryListProps) {
  const [editing, setEditing] = useState<WishHistory | null>(null);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (data: { doneAt: string; comment?: string }) => {
    if (!editing) return;
    setSaving(true);
    try {
      await onUpdate(editing.id, data);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  if (histories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <span className="text-4xl mb-3">📅</span>
        <p className="text-sm">実施済みのアイテムがありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border rounded-xl overflow-hidden bg-card border border-border mx-4">
        {histories.map((h) => (
          <div key={h.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{h.wish.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {h.member.nickname} · {formatDate(h.doneAt)}
              </p>
              {h.comment && (
                <p className="text-xs text-foreground/80 mt-1 bg-muted rounded px-2 py-1">
                  {h.comment}
                </p>
              )}
            </div>
            <button
              onClick={() => setEditing(h)}
              className={cn("text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors shrink-0")}
            >
              <Pencil size={15} />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>実施記録を編集</DialogTitle>
          </DialogHeader>
          {editing && (
            <HistoryForm
              initial={{ doneAt: editing.doneAt, comment: editing.comment }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              loading={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
