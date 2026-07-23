"use client";

import { useState } from "react";
import { StationSearch } from "@/components/common/StationSearch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  GroupMember,
  Genre,
  Region,
  Situation,
  Budget,
  Duration,
  Season,
  SITUATION_LABELS,
  BUDGET_LABELS,
  DURATION_LABELS,
  SEASON_LABELS,
} from "@/types";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { isBroadRegionTag } from "@/lib/utils/regionTag";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface RouletteFilterProps {
  open: boolean;
  onClose: () => void;
  members: GroupMember[];
  genres?: Genre[];
  regions?: Region[];
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

function Section({ title, children, collapsible = false, defaultOpen = true }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
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
const DISTANCE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 100];

export function RouletteFilter({ open, onClose, members, genres = [], regions = [] }: RouletteFilterProps) {
  const { filter, setFilter, resetFilter } = useRouletteStore();

  const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
  const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  const sliderPos = filter.nearbyKm === null ? 0 : DISTANCE_VALUES.indexOf(filter.nearbyKm) + 1;
  const distanceLabel = filter.nearbyKm === null ? "指定なし" : `${filter.nearbyKm}km以内`;

  const handleSlider = (vals: number | readonly number[]) => {
    const pos = Array.isArray(vals) ? (vals as number[])[0] : (vals as number);
    setFilter({ nearbyKm: pos === 0 ? null : DISTANCE_VALUES[pos - 1] });
  };

  const hasFilters =
    filter.memberIds.length > 0 ||
    filter.situations.length > 0 ||
    filter.budgets.length > 0 ||
    filter.durations.length > 0 ||
    filter.seasons.length > 0 ||
    filter.genreIds.length > 0 ||
    filter.excludeGenreIds.length > 0 ||
    filter.regionIds.length > 0 ||
    filter.nearbyKm !== null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-6">
        <SheetHeader className="mt-6 mb-4 p-0">
          <SheetTitle>ルーレット絞り込み</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5">
          {members.length > 0 && (
            <Section title="登録者">
              {members.map((m) => (
                <FilterChip
                  key={m.id}
                  selected={filter.memberIds.includes(m.id)}
                  onClick={() => setFilter({ memberIds: toggle(filter.memberIds, m.id) })}
                  label={m.nickname}
                />
              ))}
            </Section>
          )}

          <Section title="シチュエーション">
            {SITUATIONS.map((s) => (
              <FilterChip
                key={s}
                selected={filter.situations.includes(s)}
                onClick={() => setFilter({ situations: toggle(filter.situations, s) })}
                label={SITUATION_LABELS[s]}
              />
            ))}
          </Section>

          <Section title="予算">
            {BUDGETS.map((b) => (
              <FilterChip
                key={b}
                selected={filter.budgets.includes(b)}
                onClick={() => setFilter({ budgets: toggle(filter.budgets, b) })}
                label={BUDGET_LABELS[b]}
              />
            ))}
          </Section>

          <Section title="所要時間">
            {DURATIONS.map((d) => (
              <FilterChip
                key={d}
                selected={filter.durations.includes(d)}
                onClick={() => setFilter({ durations: toggle(filter.durations, d) })}
                label={DURATION_LABELS[d]}
              />
            ))}
          </Section>

          <Section title="季節タグ">
            {SEASONS.map((s) => (
              <FilterChip
                key={s}
                selected={filter.seasons.includes(s)}
                onClick={() => setFilter({ seasons: toggle(filter.seasons, s) })}
                label={SEASON_LABELS[s]}
              />
            ))}
          </Section>

          {broadRegions.length > 0 && (
            <Section title="中地域タグ">
              {broadRegions.map((r) => (
                <FilterChip
                  key={r.id}
                  selected={filter.regionIds.includes(r.id)}
                  onClick={() => setFilter({ regionIds: toggle(filter.regionIds, r.id) })}
                  label={r.name}
                />
              ))}
            </Section>
          )}

          {specificRegions.length > 0 && (
            <Section title="小地域タグ" collapsible defaultOpen={false}>
              {specificRegions.map((r) => (
                <FilterChip
                  key={r.id}
                  selected={filter.regionIds.includes(r.id)}
                  onClick={() => setFilter({ regionIds: toggle(filter.regionIds, r.id) })}
                  label={r.name}
                />
              ))}
            </Section>
          )}

          {genres.length > 0 && (
            <Section title="ジャンル（含む）">
              {genres.map((g) => (
                <FilterChip
                  key={g.id}
                  selected={filter.genreIds.includes(g.id)}
                  onClick={() => setFilter({ genreIds: toggle(filter.genreIds, g.id) })}
                  label={g.name}
                />
              ))}
            </Section>
          )}

          {genres.length > 0 && (
            <Section title="ジャンル（除外）">
              {genres.map((g) => (
                <FilterChip
                  key={g.id}
                  selected={filter.excludeGenreIds.includes(g.id)}
                  onClick={() => setFilter({ excludeGenreIds: toggle(filter.excludeGenreIds, g.id) })}
                  label={g.name}
                  variant="exclude"
                />
              ))}
            </Section>
          )}

          <Section title="距離で絞り込み">
            <div className="w-full flex flex-col gap-3">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter({ stationName: null })}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors", filter.stationName === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  現在地
                </button>
                <button
                  type="button"
                  onClick={() => setFilter({ stationName: filter.stationName ?? "" })}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors", filter.stationName !== null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  駅名
                </button>
              </div>
              {filter.stationName !== null && (
                <StationSearch
                  value={filter.stationName || null}
                  onChange={(name) => setFilter({ stationName: name ?? "" })}
                />
              )}
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium", filter.nearbyKm !== null && "text-primary")}>
                  {distanceLabel}
                </span>
                {filter.nearbyKm !== null && (
                  <button
                    type="button"
                    onClick={() => setFilter({ nearbyKm: null })}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    クリア
                  </button>
                )}
              </div>
              <Slider
                min={0}
                max={DISTANCE_VALUES.length}
                step={1}
                value={[sliderPos]}
                onValueChange={handleSlider}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>指定なし</span>
                <span>100km</span>
              </div>
            </div>
          </Section>
        </div>

        <div className="flex gap-2 mt-6 pb-8">
          {hasFilters && (
            <Button variant="outline" onClick={resetFilter} className="flex-1">
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
