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
import { useFilterStore } from "@/lib/store/filterStore";
import { isBroadRegionTag, specificRegionSortKey } from "@/lib/utils/regionTag";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FilterPanelProps {
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

function FilterSection({ title, children, collapsible = false, defaultOpen = true }: {
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

export function FilterPanel({ open, onClose, members, genres = [], regions = [] }: FilterPanelProps) {
  const store = useFilterStore();

  const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
  const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
    .sort((a, b) => {
      const [ga, na] = specificRegionSortKey(a.name);
      const [gb, nb] = specificRegionSortKey(b.name);
      if (ga !== gb) return ga - gb;
      return na.localeCompare(nb, "ja");
    });

  const excludeChanged =
    store.excludeGenreIds.some((id) => !store.defaultExcludeGenreIds.includes(id)) ||
    store.defaultExcludeGenreIds.some((id) => !store.excludeGenreIds.includes(id)) ||
    store.excludeRegionIds.some((id) => !store.defaultExcludeRegionIds.includes(id)) ||
    store.defaultExcludeRegionIds.some((id) => !store.excludeRegionIds.includes(id));

  const hasFilters =
    store.memberIds.length > 0 ||
    store.situations.length > 0 ||
    store.budgets.length > 0 ||
    store.durations.length > 0 ||
    store.seasons.length > 0 ||
    store.genreIds.length > 0 ||
    store.regionIds.length > 0 ||
    store.excludeRegionIds.length > 0 ||
    store.nearbyKm !== null ||
    excludeChanged;

  const sliderPos = store.nearbyKm === null ? 0 : DISTANCE_VALUES.indexOf(store.nearbyKm) + 1;
  const distanceLabel = store.nearbyKm === null ? "指定なし" : `${store.nearbyKm}km以内`;

  const handleSlider = (vals: number | readonly number[]) => {
    const pos = Array.isArray(vals) ? (vals as number[])[0] : (vals as number);
    store.setNearbyKm(pos === 0 ? null : DISTANCE_VALUES[pos - 1]);
  };

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

          {broadRegions.length > 0 && (
            <FilterSection title="中地域タグ">
              {broadRegions.map((r) => (
                <FilterChip
                  key={r.id}
                  selected={store.regionIds.includes(r.id)}
                  onClick={() => store.setRegionIds(toggle(store.regionIds, r.id))}
                  label={r.name}
                />
              ))}
            </FilterSection>
          )}

          {specificRegions.length > 0 && (
            <FilterSection title="小地域タグ" collapsible defaultOpen={false}>
              {specificRegions.map((r) => (
                <FilterChip
                  key={r.id}
                  selected={store.regionIds.includes(r.id)}
                  onClick={() => store.setRegionIds(toggle(store.regionIds, r.id))}
                  label={r.name}
                />
              ))}
            </FilterSection>
          )}

          {broadRegions.length > 0 && (
            <FilterSection title="中地域タグ（除外）">
              {broadRegions.map((r) => (
                <FilterChip
                  key={r.id}
                  selected={store.excludeRegionIds.includes(r.id)}
                  onClick={() => store.setExcludeRegionIds(toggle(store.excludeRegionIds, r.id))}
                  label={r.name}
                  variant="exclude"
                />
              ))}
            </FilterSection>
          )}

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
              {genres.length > 0 && (
                <div className="w-full flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">検索方法:</span>
                  <button
                    type="button"
                    onClick={() => store.setGenreSearchMode("OR")}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      store.genreSearchMode === "OR"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    OR
                  </button>
                  <button
                    type="button"
                    onClick={() => store.setGenreSearchMode("AND")}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      store.genreSearchMode === "AND"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    AND
                  </button>
                </div>
              )}
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

          <FilterSection title="距離で絞り込み">
            <div className="w-full flex flex-col gap-3">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => store.setStationName(null)}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors", store.stationName === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  現在地
                </button>
                <button
                  type="button"
                  onClick={() => store.setStationName(store.stationName ?? "")}
                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors", store.stationName !== null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  駅名
                </button>
              </div>
              {store.stationName !== null && (
                <StationSearch
                  value={store.stationName || null}
                  onChange={(name) => store.setStationName(name ?? "")}
                />
              )}
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium", store.nearbyKm !== null && "text-primary")}>
                  {distanceLabel}
                </span>
                {store.nearbyKm !== null && (
                  <button
                    type="button"
                    onClick={() => store.setNearbyKm(null)}
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
          </FilterSection>
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
