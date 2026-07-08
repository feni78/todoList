"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wish, SITUATION_ICONS, SEASON_LABELS, scoreToIcon } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WishForm } from "./WishForm";
import { Trash2, Pencil } from "lucide-react";
import { getGroupMember } from "@/lib/utils/localStorage";
import { useGroupStore } from "@/lib/store/groupStore";

interface WishItemProps {
  wish: Wish;
  onUpdate: (id: string, data: Parameters<typeof WishForm>[0]["onSubmit"] extends (d: infer D) => Promise<void> ? D : never) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: Wish["status"]) => Promise<void>;
}

export function WishItem({ wish, onUpdate, onDelete, onStatusChange }: WishItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentMemberId = getGroupMember(wish.groupId)?.memberId;
  const { group } = useGroupStore();
  const members = group?.members ?? [];
  const hasMyVote = wish.votes.some((v) => v.memberId === currentMemberId);

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

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 active:bg-muted/50 transition-colors"
      >
        <span className="text-2xl shrink-0 w-8 h-8 flex items-center justify-center">
          {wish.avgScore > 0 ? scoreToIcon(wish.avgScore) : "ー"}
        </span>

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
            {!hasMyVote && wish.status !== "DONE" && (
              <span className="text-xs shrink-0" title="やりたい度が未設定">⚠️</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{wish.member.nickname}</span>
            {wish.status === "DONE" && (
              <span className="text-xs text-muted-foreground">{new Date(wish.updatedAt).toLocaleDateString("ja-JP")}</span>
            )}
            {wish.seasons.length > 0 && wish.seasons.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] px-1 py-0 h-4">
                {SEASON_LABELS[s]}
              </Badge>
            ))}
          </div>
          {wish.votes.length > 0 && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {wish.votes.map((vote) => {
                const m = members.find((mm) => mm.id === vote.memberId);
                const name = m?.nickname ?? vote.memberId.slice(0, 4);
                return (
                  <span key={vote.memberId} className="text-[11px] text-muted-foreground leading-none">
                    {scoreToIcon(vote.score)}{name}
                  </span>
                );
              })}
            </div>
          )}
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
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain">
          <DialogHeader>
            <DialogTitle>編集</DialogTitle>
          </DialogHeader>
          <WishForm
            initial={wish}
            currentMemberId={currentMemberId}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            loading={saving}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
