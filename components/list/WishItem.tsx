"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wish,
  PRIORITY_ICONS,
  PRIORITY_LABELS,
  SITUATION_ICONS,
  STATUS_LABELS,
  SEASON_LABELS,
} from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WishForm } from "./WishForm";
import { Trash2, Pencil } from "lucide-react";

interface WishItemProps {
  wish: Wish;
  onUpdate: (id: string, data: Parameters<typeof WishForm>[0]["onSubmit"] extends (d: infer D) => Promise<void> ? D : never) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: Wish["status"]) => Promise<void>;
}

export function WishItem({ wish, onUpdate, onDelete, onStatusChange }: WishItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (data: Parameters<typeof WishForm>[0]["onSubmit"] extends (d: infer D) => Promise<void> ? D : never) => {
    setSaving(true);
    try {
      await onUpdate(wish.id, data);
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("削除してよろしいですか？")) return;
    await onDelete(wish.id);
  };

  const cyclicStatus = async () => {
    const next: Record<Wish["status"], Wish["status"]> = {
      PENDING: "DONE",
      DONE: "HOLD",
      HOLD: "PENDING",
    };
    await onStatusChange(wish.id, next[wish.status]);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 active:bg-muted/50 transition-colors"
      >
        <button
          onClick={cyclicStatus}
          className="text-2xl shrink-0 w-8 h-8 flex items-center justify-center"
          title={PRIORITY_LABELS[wish.priority]}
        >
          {PRIORITY_ICONS[wish.priority]}
        </button>

        <button
          className="flex-1 text-left min-w-0"
          onClick={() => setEditOpen(true)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "text-sm font-medium truncate",
                wish.status === "DONE" && "line-through text-muted-foreground",
                wish.status === "HOLD" && "text-muted-foreground"
              )}
            >
              {wish.title}
            </span>
            {wish.situation === "OUTSIDE" && (
              <span className="text-xs shrink-0">{SITUATION_ICONS.OUTSIDE}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{wish.member.nickname}</span>
            {wish.seasons.length > 0 && (
              <>
                {wish.seasons.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {SEASON_LABELS[s]}
                  </Badge>
                ))}
              </>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </motion.div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編集</DialogTitle>
          </DialogHeader>
          <WishForm
            initial={wish}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            loading={saving}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
