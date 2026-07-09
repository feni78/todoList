"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Wish,
  Genre,
  Situation,
  Status,
  Budget,
  Duration,
  Season,
  SITUATION_LABELS,
  SITUATION_ICONS,
  STATUS_LABELS,
  BUDGET_LABELS,
  DURATION_LABELS,
  SEASON_LABELS,
  SCORE_OPTIONS,
  ScoreValue,
} from "@/types";
import { cn } from "@/lib/utils";

interface WishFormData {
  title: string;
  situation: Situation;
  status: Status;
  memo: string;
  budget: Budget | "";
  duration: Duration | "";
  seasons: Season[];
  genreIds: string[];
  myScore: ScoreValue | null;
}

interface WishFormProps {
  initial?: Wish;
  currentMemberId?: string;
  genres?: Genre[];
  onSubmit: (data: {
    title: string;
    situation: Situation;
    status: Status;
    memo?: string;
    budget?: Budget;
    duration?: Duration;
    seasons: Season[];
    genreIds?: string[];
    myScore?: ScoreValue | null;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

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

export function WishForm({ initial, currentMemberId, genres = [], onSubmit, onCancel, loading }: WishFormProps) {
  const existingVote = initial?.votes.find((v) => v.memberId === currentMemberId);
  // 新規作成 or 自分が登録したものの編集 → 必須
  const scoreRequired = !initial || initial.memberId === currentMemberId;

  const [form, setForm] = useState<WishFormData>({
    title: initial?.title ?? "",
    situation: initial?.situation ?? "OUTSIDE",
    status: initial?.status ?? "PENDING",
    memo: initial?.memo ?? "",
    budget: initial?.budget ?? "",
    duration: initial?.duration ?? "",
    seasons: initial?.seasons ?? [],
    genreIds: initial?.genres.map((g) => g.id) ?? [],
    myScore: existingVote?.score ?? null,
  });

  const toggleSeason = (season: Season) => {
    setForm((f) => ({
      ...f,
      seasons: f.seasons.includes(season)
        ? f.seasons.filter((s) => s !== season)
        : [...f.seasons, season],
    }));
  };

  const toggleGenre = (genreId: string) => {
    setForm((f) => ({
      ...f,
      genreIds: f.genreIds.includes(genreId)
        ? f.genreIds.filter((id) => id !== genreId)
        : [...f.genreIds, genreId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (scoreRequired && !form.myScore) return;
    await onSubmit({
      title: form.title.trim(),
      situation: form.situation,
      status: form.status,
      memo: form.memo.trim() || undefined,
      budget: form.budget || undefined,
      duration: form.duration || undefined,
      seasons: form.seasons,
      genreIds: form.genreIds,
      myScore: form.myScore,
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
        <Label>{scoreRequired ? "やりたい度（あなたの評価） *" : "やりたい度（あなたの評価）"}</Label>
        <div className="flex gap-1.5">
          {SCORE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                myScore: (!scoreRequired && f.myScore === opt.value) ? null : opt.value as ScoreValue,
              }))}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-colors",
                form.myScore === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
        {!scoreRequired && <p className="text-[11px] text-muted-foreground">タップで選択・もう一度タップで解除</p>}
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
          className="break-all"
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

      {genres.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>ジャンル（任意・複数選択可）</Label>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.id)}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-xs font-medium transition-colors",
                  form.genreIds.includes(g.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          キャンセル
        </Button>
        <Button type="submit" disabled={loading || !form.title.trim() || (scoreRequired && !form.myScore)} className="flex-1">
          {loading ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
