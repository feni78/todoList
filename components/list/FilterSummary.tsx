"use client";

import { X } from "lucide-react";
import { useFilterStore } from "@/lib/store/filterStore";
import { Genre, Region, GroupMember, SITUATION_LABELS, BUDGET_LABELS, DURATION_LABELS, SEASON_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface FilterSummaryProps {
  genres?: Genre[];
  regions?: Region[];
  members?: GroupMember[];
  className?: string;
}

function SummaryChip({ label, onRemove, variant = "default" }: {
  label: string;
  onRemove: () => void;
  variant?: "default" | "exclude" | "distance";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium shrink-0",
        variant === "exclude"
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : variant === "distance"
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-primary/10 text-primary border border-primary/20"
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
      >
        <X size={10} />
      </button>
    </span>
  );
}

export function FilterSummary({ genres = [], regions = [], members = [], className }: FilterSummaryProps) {
  const store = useFilterStore();

  const chips: { key: string; label: string; variant?: "default" | "exclude" | "distance"; onRemove: () => void }[] = [];

  // 距離
  if (store.nearbyKm !== null) {
    const locationLabel = store.stationName ? `${store.stationName}駅` : "現在地";
    chips.push({
      key: "distance",
      label: `📍 ${locationLabel} ${store.nearbyKm}km以内`,
      variant: "distance",
      onRemove: () => store.setNearbyKm(null),
    });
  }

  // 地域タグ（含む）
  store.regionIds.forEach((id) => {
    const r = regions.find((r) => r.id === id);
    if (r) chips.push({ key: `region-${id}`, label: r.name, onRemove: () => store.setRegionIds(store.regionIds.filter((x) => x !== id)) });
  });

  // 地域タグ（除外）
  store.excludeRegionIds.forEach((id) => {
    const r = regions.find((r) => r.id === id);
    if (r) chips.push({ key: `ex-region-${id}`, label: `✕ ${r.name}`, variant: "exclude", onRemove: () => store.setExcludeRegionIds(store.excludeRegionIds.filter((x) => x !== id)) });
  });

  // シチュエーション
  store.situations.forEach((s) => {
    chips.push({ key: `sit-${s}`, label: SITUATION_LABELS[s], onRemove: () => store.setSituations(store.situations.filter((x) => x !== s)) });
  });

  // 季節
  store.seasons.forEach((s) => {
    chips.push({ key: `season-${s}`, label: SEASON_LABELS[s], onRemove: () => store.setSeasons(store.seasons.filter((x) => x !== s)) });
  });

  // 予算
  store.budgets.forEach((b) => {
    chips.push({ key: `budget-${b}`, label: BUDGET_LABELS[b], onRemove: () => store.setBudgets(store.budgets.filter((x) => x !== b)) });
  });

  // 所要時間
  store.durations.forEach((d) => {
    chips.push({ key: `dur-${d}`, label: DURATION_LABELS[d], onRemove: () => store.setDurations(store.durations.filter((x) => x !== d)) });
  });

  // ジャンル（含む）
  store.genreIds.forEach((id) => {
    const g = genres.find((g) => g.id === id);
    if (g) chips.push({ key: `genre-${id}`, label: g.name, onRemove: () => store.setGenreIds(store.genreIds.filter((x) => x !== id)) });
  });

  // ジャンル（除外）
  store.excludeGenreIds
    .filter((id) => !store.defaultExcludeGenreIds.includes(id))
    .forEach((id) => {
      const g = genres.find((g) => g.id === id);
      if (g) chips.push({ key: `ex-genre-${id}`, label: `✕ ${g.name}`, variant: "exclude", onRemove: () => store.setExcludeGenreIds(store.excludeGenreIds.filter((x) => x !== id)) });
    });

  // 登録者
  store.memberIds.forEach((id) => {
    const m = members.find((m) => m.id === id);
    if (m) chips.push({ key: `member-${id}`, label: m.nickname, onRemove: () => store.setMemberIds(store.memberIds.filter((x) => x !== id)) });
  });

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-none", className)}>
      {chips.map((chip) => (
        <SummaryChip key={chip.key} label={chip.label} variant={chip.variant} onRemove={chip.onRemove} />
      ))}
      <button
        type="button"
        onClick={store.reset}
        className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-1 whitespace-nowrap"
      >
        全解除
      </button>
    </div>
  );
}
