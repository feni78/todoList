"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface HistoryFormProps {
  initial?: { doneAt: string; comment?: string };
  onSubmit: (data: { doneAt: string; comment?: string }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function HistoryForm({ initial, onSubmit, onCancel, loading }: HistoryFormProps) {
  const todayStr = toLocalDateStr(new Date());
  const initDate = initial?.doneAt ? toLocalDateStr(new Date(initial.doneAt)) : todayStr;

  const [doneAt, setDoneAt] = useState(initDate);
  const [comment, setComment] = useState(initial?.comment ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      doneAt: new Date(doneAt + "T00:00:00").toISOString(),
      comment: comment.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doneAt">実施日</Label>
        <Input
          id="doneAt"
          type="date"
          value={doneAt}
          max={todayStr}
          onChange={(e) => setDoneAt(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comment">感想（任意）</Label>
        <Textarea
          id="comment"
          placeholder="どうだった？"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          キャンセル
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
