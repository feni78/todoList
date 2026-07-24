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
import { useShallow } from "zustand/react/shallow";
import { isBroadRegionTag, specificRegionSortKey, specificRegionColorClasses } from "@/lib/utils/regionTag";
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
        "px-3 py-2 rounded-xl text-sm font-medium transition-colors",
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

function FilterSection({ title, children, collapsible = false, defaultOpen = true, onClear, noDivider = false, count = 0 }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onClear?: () => void;
  noDivider?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  return (
    <div className={cn("flex flex-col gap-3 py-4", !noDivider && "border-t border-border/60")}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-1.5 text-left flex-1"
          onClick={() => collapsible && setOpen((v) => !v)}
        >
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {count > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
              {count}
            </span>
          )}
          {collapsible && (open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />)}
        </button>
        {onClear && (
          <button type="button" onClick={onClear} className="text-xs text-primary hover:text-primary/80 transition-colors shrink-0 font-medium">
            クリア
          </button>
        )}
      </div>
      {open && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function IncludeExcludeSection({ title, children, collapsible = false, defaultOpen = true, count = 0, noDivider = false }: {
  title: string;
  children: (mode: "include" | "exclude") => React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  count?: number;
  noDivider?: boolean;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  const [mode, setMode] = useState<"include" | "exclude">("include");
  return (
    <div className={cn("flex flex-col gap-3 py-4", !noDivider && "border-t border-border/60")}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex items-center gap-1.5 text-left flex-1"
          onClick={() => collapsible && setOpen((v) => !v)}
        >
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {count > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
              {count}
            </span>
          )}
          {collapsible && (open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />)}
        </button>
        {open && (
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => setMode("include")}
              className={cn("px-3 py-1.5 transition-colors", mode === "include" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60")}
            >
              含む
            </button>
            <button
              type="button"
              onClick={() => setMode("exclude")}
              className={cn("px-3 py-1.5 transition-colors border-l border-border", mode === "exclude" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-muted/60")}
            >
              除外
            </button>
          </div>
        )}
      </div>
      {open && <div className="flex flex-wrap gap-2">{children(mode)}</div>}
    </div>
  );
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

const SITUATIONS: Situation[] = ["HOME", "OUTSIDE"];
const BUDGETS: Budget[] = ["FREE", "UNDER_3000", "UNDER_10000", "OVER_10000"];
const DURATIONS: Duration[] = ["WITHIN_30MIN", "ONE_TWO_HOUR", "HALF_DAY", "FULL_DAY"];
const SEASONS: Season[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
const DISTANCE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 100];

export function FilterPanel({ open, onClose, members, genres = [], regions = [] }: FilterPanelProps) {
  const {
    memberIds, situations, budgets, durations, seasons,
    genreIds, genreSearchMode, excludeGenreIds,
    regionIds, excludeRegionIds, defaultExcludeRegionIds, defaultExcludeGenreIds,
    nearbyKm, stationName,
  } = useFilterStore(useShallow((s) => ({
    memberIds: s.memberIds,
    situations: s.situations,
    budgets: s.budgets,
    durations: s.durations,
    seasons: s.seasons,
    genreIds: s.genreIds,
    genreSearchMode: s.genreSearchMode,
    excludeGenreIds: s.excludeGenreIds,
    regionIds: s.regionIds,
    excludeRegionIds: s.excludeRegionIds,
    defaultExcludeRegionIds: s.defaultExcludeRegionIds,
    defaultExcludeGenreIds: s.defaultExcludeGenreIds,
    nearbyKm: s.nearbyKm,
    stationName: s.stationName,
  })));
  const {
    setMemberIds, setSituations, setBudgets, setDurations, setSeasons,
    setGenreIds, setGenreSearchMode, setExcludeGenreIds,
    setRegionIds, setExcludeRegionIds, setNearbyKm, setStationName, reset,
  } = useFilterStore.getState();

  const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
  const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
    .sort((a, b) => {
      const [ga, na] = specificRegionSortKey(a.name);
      const [gb, nb] = specificRegionSortKey(b.name);
      if (ga !== gb) return ga - gb;
      return na.localeCompare(nb, "ja");
    });

  const excludeChanged =
    excludeGenreIds.some((id) => !defaultExcludeGenreIds.includes(id)) ||
    defaultExcludeGenreIds.some((id) => !excludeGenreIds.includes(id)) ||
    excludeRegionIds.some((id) => !defaultExcludeRegionIds.includes(id)) ||
    defaultExcludeRegionIds.some((id) => !excludeRegionIds.includes(id));

  const regionIncludeCount = regionIds.length;
  const regionExcludeCount = excludeRegionIds.filter(
    (id) => !defaultExcludeRegionIds.includes(id)
  ).length;
  const regionCount = regionIncludeCount + regionExcludeCount;

  const hasFilters =
    memberIds.length > 0 ||
    situations.length > 0 ||
    budgets.length > 0 ||
    durations.length > 0 ||
    seasons.length > 0 ||
    genreIds.length > 0 ||
    regionIds.length > 0 ||
    excludeRegionIds.length > 0 ||
    nearbyKm !== null ||
    excludeChanged;

  const sliderPos = nearbyKm === null ? 0 : DISTANCE_VALUES.indexOf(nearbyKm) + 1;
  const distanceLabel = nearbyKm === null ? "指定なし" : `${nearbyKm}km以内`;

  const handleSlider = (vals: number | readonly number[]) => {
    const pos = Array.isArray(vals) ? (vals as number[])[0] : (vals as number);
    setNearbyKm(pos === 0 ? null : DISTANCE_VALUES[pos - 1]);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5">
        <SheetHeader className="mt-5 mb-1 p-0">
          <SheetTitle className="text-base">絞り込み</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {/* ジャンル — 含む/除外タブ */}
          {genres.length > 0 && (
            <IncludeExcludeSection title="ジャンル" count={genreIds.length + excludeGenreIds.filter((id) => !defaultExcludeGenreIds.includes(id)).length} noDivider>
              {(mode) => {
                if (mode === "include") {
                  return (
                    <>
                      {genres.map((g) => (
                        <FilterChip
                          key={g.id}
                          selected={genreIds.includes(g.id)}
                          onClick={() => setGenreIds(toggle(genreIds, g.id))}
                          label={g.name}
                        />
                      ))}
                      <div className="w-full flex items-center gap-2 mt-1 pt-1 border-t border-border/40">
                        <span className="text-xs text-muted-foreground">複数選択時:</span>
                        <button
                          type="button"
                          onClick={() => setGenreSearchMode("OR")}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                            genreSearchMode === "OR"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          )}
                        >
                          いずれか (OR)
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenreSearchMode("AND")}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                            genreSearchMode === "AND"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          )}
                        >
                          すべて (AND)
                        </button>
                      </div>
                    </>
                  );
                } else {
                  return genres.map((g) => (
                    <FilterChip
                      key={g.id}
                      selected={excludeGenreIds.includes(g.id)}
                      onClick={() => setExcludeGenreIds(toggle(excludeGenreIds, g.id))}
                      label={g.name}
                      variant="exclude"
                    />
                  ));
                }
              }}
            </IncludeExcludeSection>
          )}

          {/* シチュエーション — 単一選択 */}
          <FilterSection title="シチュエーション" count={situations.length}>
            {SITUATIONS.map((s) => (
              <FilterChip
                key={s}
                selected={situations.includes(s)}
                onClick={() =>
                  setSituations(
                    situations.includes(s) ? [] : [s]
                  )
                }
                label={SITUATION_LABELS[s]}
              />
            ))}
          </FilterSection>

          {/* 距離 */}
          <FilterSection title="距離で絞り込み" count={nearbyKm !== null ? 1 : 0}>
            <div className="w-full flex flex-col gap-3">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setStationName(null)}
                  className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-colors", stationName === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  現在地
                </button>
                <button
                  type="button"
                  onClick={() => setStationName(stationName ?? "")}
                  className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-colors", stationName !== null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  駅名
                </button>
              </div>
              {stationName !== null && (
                <StationSearch
                  value={stationName || null}
                  onChange={(name) => setStationName(name ?? "")}
                />
              )}
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-semibold", nearbyKm !== null ? "text-primary" : "text-muted-foreground")}>
                  {distanceLabel}
                </span>
                {nearbyKm !== null && (
                  <button
                    type="button"
                    onClick={() => setNearbyKm(null)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
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
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>指定なし</span>
                <span>100km</span>
              </div>
            </div>
          </FilterSection>

          {/* 地域タグ — 含む/除外タブ */}
          {(broadRegions.length > 0 || specificRegions.length > 0) && (
            <IncludeExcludeSection title="地域タグ" count={regionCount}>
              {(mode) => {
                if (mode === "include") {
                  const broadIds = broadRegions.map((r) => r.id);
                  const hasBroad = regionIds.some((id) => broadIds.includes(id));
                  const specificIds = specificRegions.map((r) => r.id);
                  const hasSpecific = regionIds.some((id) => specificIds.includes(id));
                  return (
                    <>
                      {broadRegions.map((r) => (
                        <FilterChip
                          key={r.id}
                          selected={regionIds.includes(r.id)}
                          onClick={() => setRegionIds(toggle(regionIds, r.id))}
                          label={r.name}
                        />
                      ))}
                      {specificRegions.length > 0 && (
                        <SpecificRegionExpander
                          regions={specificRegions}
                          selectedIds={regionIds}
                          onToggle={(id) => setRegionIds(toggle(regionIds, id))}
                          onClear={hasSpecific ? () => setRegionIds(regionIds.filter((id) => !specificIds.includes(id))) : undefined}
                        />
                      )}
                      {(hasBroad) && (
                        <button
                          type="button"
                          onClick={() => setRegionIds(regionIds.filter((id) => !broadIds.includes(id)))}
                          className="text-xs text-primary hover:text-primary/80 font-medium ml-auto mt-1"
                        >
                          中地域クリア
                        </button>
                      )}
                    </>
                  );
                } else {
                  return broadRegions.map((r) => (
                    <FilterChip
                      key={r.id}
                      selected={excludeRegionIds.includes(r.id)}
                      onClick={() => setExcludeRegionIds(toggle(excludeRegionIds, r.id))}
                      label={r.name}
                      variant="exclude"
                    />
                  ));
                }
              }}
            </IncludeExcludeSection>
          )}

          {/* 予算 */}
          <FilterSection title="予算" count={budgets.length}>
            {BUDGETS.map((b) => (
              <FilterChip
                key={b}
                selected={budgets.includes(b)}
                onClick={() => setBudgets(toggle(budgets, b))}
                label={BUDGET_LABELS[b]}
              />
            ))}
          </FilterSection>

          {/* 所要時間 */}
          <FilterSection title="所要時間" count={durations.length}>
            {DURATIONS.map((d) => (
              <FilterChip
                key={d}
                selected={durations.includes(d)}
                onClick={() => setDurations(toggle(durations, d))}
                label={DURATION_LABELS[d]}
              />
            ))}
          </FilterSection>

          {/* 季節・登録者 — 折りたたみ */}
          <FilterSection title="季節タグ" collapsible defaultOpen={seasons.length > 0} count={seasons.length}>
            {SEASONS.map((s) => (
              <FilterChip
                key={s}
                selected={seasons.includes(s)}
                onClick={() => setSeasons(toggle(seasons, s))}
                label={SEASON_LABELS[s]}
              />
            ))}
          </FilterSection>

          {members.length > 0 && (
            <FilterSection title="登録者" collapsible defaultOpen={memberIds.length > 0} count={memberIds.length}>
              {members.map((m) => (
                <FilterChip
                  key={m.id}
                  selected={memberIds.includes(m.id)}
                  onClick={() => setMemberIds(toggle(memberIds, m.id))}
                  label={m.nickname}
                />
              ))}
            </FilterSection>
          )}
        </div>

        <div className="flex gap-2 mt-4 pb-8">
          {hasFilters && (
            <Button variant="outline" onClick={reset} className="flex-1">
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

function SpecificRegionExpander({ regions, selectedIds, onToggle, onClear }: {
  regions: Region[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(selectedIds.some((id) => regions.some((r) => r.id === id)));
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          小地域タグ
        </button>
        {onClear && open && (
          <button type="button" onClick={onClear} className="text-xs text-primary hover:text-primary/80 font-medium">
            クリア
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggle(r.id)}
              className={cn("px-3 py-2 rounded-xl text-sm font-medium transition-colors", specificRegionColorClasses(r.name, selectedIds.includes(r.id)))}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
