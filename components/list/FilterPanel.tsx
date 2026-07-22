"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  GroupMember,
  Genre,
  Situation,
  Budget,
  Duration,
  Season,
  SITUATION_LABELS,
  BUDGET_LABELS,
  DURATION_LABELS,
  SEASON_LABELS,
} from "@/types";
import { useFilterStore } from "@/lib/store/filterStore";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  members: GroupMember[];
  genres?: Genre[];
}

function FilterChip({ selected, onClick, label, variant = "default" }: {
  selected: boolean;
  onClick: () => void;
  label: string;
  variant?: "default" | "exclude";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        variant === "exclude"
          ? selected
            ? "bg-destructive text-destructive-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/70"
          : selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {variant === "exclude" && selected ? `✕ ${label}` : label}
    </button>
  );
}

function FilterSection({ title, children, collapsible = false }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-1 text-left"
        onClick={() => collapsible && setOpen((v) => !v)}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">{title}</p>
        {collapsible && (open ? <ChevronDown size={13} className="text-muted-foreground" /> : <ChevronRight size={13} className="text-muted-foreground" />)}
      </button>
      {open && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

const SITUATIONS: Situation[] = ["HOME", "OUTSIDE", "EITHER"];
const BUDGETS: Budget[] = ["FREE", "UNDER_3000", "UNDER_10000", "OVER_10000"];
const DURATIONS: Duration[] = ["WITHIN_30MIN", "ONE_TWO_HOUR", "HALF_DAY", "FULL_DAY"];
const SEASONS: Season[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];

export function FilterPanel({ open, onClose, members, genres = [] }: FilterPanelProps) {
  const store = useFilterStore();

  const excludeChanged =
    store.excludeGenreIds.some((id) => !store.defaultExcludeGenreIds.includes(id)) ||
    store.defaultExcludeGenreIds.some((id) => !store.excludeGenreIds.includes(id));

  const hasFilters =
    store.memberIds.length > 0 ||
    store.situations.length > 0 ||
    store.budgets.length > 0 ||
    store.durations.length > 0 ||
    store.seasons.length > 0 ||
    store.genreIds.length > 0 ||
    excludeChanged;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-6">
        <SheetHeader className="mt-6 mb-4 p-0">
          <SheetTitle>絞り込み</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5">
          {members.length > 0 && (
            <FilterSection title="登録者">
              {members.map((m) => (
                <FilterChip
                  key={m.id}
                  selected={store.memberIds.includes(m.id)}
                  onClick={() => store.setMemberIds(toggle(store.memberIds, m.id))}
                  label={m.nickname}
                />
              ))}
            </FilterSection>
          )}

          <FilterSection title="シチュエーション">
            {SITUATIONS.map((s) => (
              <FilterChip
                key={s}
                selected={store.situations.includes(s)}
                onClick={() => store.setSituations(toggle(store.situations, s))}
                label={SITUATION_LABELS[s]}
              />
            ))}
          </FilterSection>

          <FilterSection title="予算">
            {BUDGETS.map((b) => (
              <FilterChip
                key={b}
                selected={store.budgets.includes(b)}
                onClick={() => store.setBudgets(toggle(store.budgets, b))}
                label={BUDGET_LABELS[b]}
              />
            ))}
          </FilterSection>

          <FilterSection title="所要時間">
            {DURATIONS.map((d) => (
              <FilterChip
                key={d}
                selected={store.durations.includes(d)}
                onClick={() => store.setDurations(toggle(store.durations, d))}
                label={DURATION_LABELS[d]}
              />
            ))}
          </FilterSection>

          <FilterSection title="季節タグ">
            {SEASONS.map((s) => (
              <FilterChip
                key={s}
                selected={store.seasons.includes(s)}
                onClick={() => store.setSeasons(toggle(store.seasons, s))}
                label={SEASON_LABELS[s]}
              />
            ))}
          </FilterSection>

          {genres.length > 0 && (
            <FilterSection title="ジャンル（含む）">
              {genres.map((g) => (
                <FilterChip
                  key={g.id}
                  selected={store.genreIds.includes(g.id)}
                  onClick={() => store.setGenreIds(toggle(store.genreIds, g.id))}
                  label={g.name}
                />
              ))}
            </FilterSection>
          )}

          {genres.length > 0 && (
            <FilterSection title="ジャンル（除外）">
              {genres.map((g) => (
                <FilterChip
                  key={g.id}
                  selected={store.excludeGenreIds.includes(g.id)}
                  onClick={() => store.setExcludeGenreIds(toggle(store.excludeGenreIds, g.id))}
                  label={g.name}
                  variant="exclude"
                />
              ))}
            </FilterSection>
          )}
        </div>

        <div className="flex gap-2 mt-6 pb-8">
          {hasFilters && (
            <Button variant="outline" onClick={store.reset} className="flex-1">
              リセット
            </Button>
          )}
          <Button onClick={onClose} className="flex-1">
            適用
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
