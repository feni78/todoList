"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Wish,
  Priority,
  Situation,
  Status,
  Budget,
  Duration,
  Season,
  PRIORITY_LABELS,
  PRIORITY_ICONS,
  SITUATION_LABELS,
  SITUATION_ICONS,
  STATUS_LABELS,
  BUDGET_LABELS,
  DURATION_LABELS,
  SEASON_LABELS,
} from "@/types";
import { cn } from "@/lib/utils";

interface WishFormData {
  title: string;
  priority: Priority;
  situation: Situation;
  status: Status;
  memo: string;
  budget: Budget | "";
  duration: Duration | "";
  seasons: Season[];
}

interface WishFormProps {
  initial?: Wish;
  onSubmit: (data: {
    title: string;
    priority: Priority;
    situation: Situation;
    status: Status;
    memo?: string;
    budget?: Budget;
    duration?: Duration;
    seasons: Season[];
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const PRIORITIES: Priority[] = ["MAX", "GOLD", "SILVER", "BRONZE"];
const SITUATIONS: Situation[] = ["HOME", "OUTSIDE"];
const STATUSES: Status[] = ["PENDING", "DONE", "HOLD"];
const BUDGETS: Budget[] = ["FREE", "UNDER_3000", "UNDER_10000", "OVER_10000"];
const DURATIONS: Duration[] = ["WITHIN_30MIN", "ONE_TWO_HOUR", "HALF_DAY", "FULL_DAY"];
const SEASONS: Season[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];

function SegmentButton<T extends string>({
  value,
  selected,
  onClick,
  label,
  icon,
}: {
  value: T;
  selected: boolean;
  onClick: (v: T) => void;
  label: string;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

export function WishForm({ initial, onSubmit, onCancel, loading }: WishFormProps) {
  const [form, setForm] = useState<WishFormData>({
    title: initial?.title ?? "",
    priority: initial?.priority ?? "GOLD",
    situation: initial?.situation ?? "HOME",
    status: initial?.status ?? "PENDING",
    memo: initial?.memo ?? "",
    budget: initial?.budget ?? "",
    duration: initial?.duration ?? "",
    seasons: initial?.seasons ?? [],
  });

  const toggleSeason = (season: Season) => {
    setForm((f) => ({
      ...f,
      seasons: f.seasons.includes(season)
        ? f.seasons.filter((s) => s !== season)
        : [...f.seasons, season],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onSubmit({
      title: form.title.trim(),
      priority: form.priority,
      situation: form.situation,
      status: form.status,
      memo: form.memo.trim() || undefined,
      budget: form.budget || undefined,
      duration: form.duration || undefined,
      seasons: form.seasons,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">タイトル *</Label>
        <Input
          id="title"
          placeholder="やりたいこと"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>やりたい度 *</Label>
        <div className="flex gap-1.5">
          {PRIORITIES.map((p) => (
            <SegmentButton
              key={p}
              value={p}
              selected={form.priority === p}
              onClick={(v) => setForm((f) => ({ ...f, priority: v }))}
              label={PRIORITY_LABELS[p]}
              icon={PRIORITY_ICONS[p]}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>シチュエーション *</Label>
        <div className="flex gap-1.5">
          {SITUATIONS.map((s) => (
            <SegmentButton
              key={s}
              value={s}
              selected={form.situation === s}
              onClick={(v) => setForm((f) => ({ ...f, situation: v }))}
              label={SITUATION_LABELS[s]}
              icon={SITUATION_ICONS[s]}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>ステータス *</Label>
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <SegmentButton
              key={s}
              value={s}
              selected={form.status === s}
              onClick={(v) => setForm((f) => ({ ...f, status: v }))}
              label={STATUS_LABELS[s]}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="memo">メモ（任意）</Label>
        <Textarea
          id="memo"
          placeholder="詳細やメモを入力"
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>予算（任意）</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {BUDGETS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setForm((f) => ({ ...f, budget: f.budget === b ? "" : b }))}
              className={cn(
                "py-2 px-3 rounded-lg text-xs font-medium transition-colors",
                form.budget === b
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {BUDGET_LABELS[b]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>所要時間（任意）</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setForm((f) => ({ ...f, duration: f.duration === d ? "" : d }))}
              className={cn(
                "py-2 px-3 rounded-lg text-xs font-medium transition-colors",
                form.duration === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {DURATION_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>季節タグ（任意・複数選択可）</Label>
        <div className="flex gap-1.5">
          {SEASONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSeason(s)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
                form.seasons.includes(s)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {SEASON_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          キャンセル
        </Button>
        <Button type="submit" disabled={loading || !form.title.trim()} className="flex-1">
          {loading ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
