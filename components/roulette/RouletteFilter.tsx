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
  Status,
  SITUATION_LABELS,
  BUDGET_LABELS,
  DURATION_LABELS,
  SEASON_LABELS,
} from "@/types";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { isBroadRegionTag, specificRegionSortKey, specificRegionColorClasses } from "@/lib/utils/regionTag";
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

function FilterSection({ title, children, collapsible = false, defaultOpen = true, noDivider = false, count = 0 }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
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
      </div>
      {open && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function IncludeExcludeSection({ title, children, count = 0 }: {
  title: string;
  children: (mode: "include" | "exclude") => React.ReactNode;
  count?: number;
}) {
  const [mode, setMode] = useState<"include" | "exclude">("include");
  return (
    <div className="flex flex-col gap-3 py-4 border-t border-border/60">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {count > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
              {count}
            </span>
          )}
        </div>
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
      </div>
      <div className="flex flex-wrap gap-2">{children(mode)}</div>
    </div>
  );
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function SpecificRegionExpander({ regions, selectedIds, onToggle }: {
  regions: Region[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(selectedIds.some((id) => regions.some((r) => r.id === id)));
  return (
    <div className="w-full flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        小地域タグ
      </button>
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

const SITUATIONS: Situation[] = ["HOME", "OUTSIDE", "EITHER"];
const BUDGETS: Budget[] = ["FREE", "UNDER_3000", "UNDER_10000", "OVER_10000"];
const DURATIONS: Duration[] = ["WITHIN_30MIN", "ONE_TWO_HOUR", "HALF_DAY", "FULL_DAY"];
const SEASONS: Season[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
const DISTANCE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 100];

export function RouletteFilter({ open, onClose, members, genres = [], regions = [] }: RouletteFilterProps) {
  const { filter, setFilter, resetFilter } = useRouletteStore();

  const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
  const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
    .sort((a, b) => {
      const [ga, na] = specificRegionSortKey(a.name);
      const [gb, nb] = specificRegionSortKey(b.name);
      if (ga !== gb) return ga - gb;
      return na.localeCompare(nb, "ja");
    });

  const sliderPos = filter.nearbyKm === null ? 0 : DISTANCE_VALUES.indexOf(filter.nearbyKm) + 1;
  const distanceLabel = filter.nearbyKm === null ? "指定なし" : `${filter.nearbyKm}km以内`;

  const handleSlider = (vals: number | readonly number[]) => {
    const pos = Array.isArray(vals) ? (vals as number[])[0] : (vals as number);
    setFilter({ nearbyKm: pos === 0 ? null : DISTANCE_VALUES[pos - 1] });
  };

  const hasFilters =
    filter.memberIds.length > 0 ||
    filter.situations.length > 0 ||
    filter.statuses.includes("DONE") ||
    filter.budgets.length > 0 ||
    filter.durations.length > 0 ||
    filter.seasons.length > 0 ||
    filter.genreIds.length > 0 ||
    filter.excludeGenreIds.length > 0 ||
    filter.regionIds.length > 0 ||
    filter.nearbyKm !== null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5">
        <SheetHeader className="mt-5 mb-1 p-0">
          <SheetTitle className="text-base">ルーレット絞り込み</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {/* 実施済み */}
          <FilterSection title="実施済み" noDivider>
            <FilterChip
              selected={filter.statuses.includes("DONE") && filter.statuses.includes("PENDING")}
              onClick={() => {
                const both = filter.statuses.includes("DONE") && filter.statuses.includes("PENDING");
                setFilter({ statuses: both ? ["PENDING"] as Status[] : ["PENDING", "DONE"] as Status[] });
              }}
              label="実施済みを含む"
            />
            <FilterChip
              selected={filter.statuses.includes("DONE") && !filter.statuses.includes("PENDING")}
              onClick={() => {
                const doneOnly = filter.statuses.includes("DONE") && !filter.statuses.includes("PENDING");
                setFilter({ statuses: doneOnly ? ["PENDING"] as Status[] : ["DONE"] as Status[] });
              }}
              label="実施済みのみ"
            />
          </FilterSection>

          {/* ジャンル */}
          {genres.length > 0 && (
            <IncludeExcludeSection title="ジャンル" count={filter.genreIds.length + filter.excludeGenreIds.length}>
              {(mode) =>
                mode === "include"
                  ? genres.map((g) => (
                      <FilterChip
                        key={g.id}
                        selected={filter.genreIds.includes(g.id)}
                        onClick={() => setFilter({ genreIds: toggle(filter.genreIds, g.id) })}
                        label={g.name}
                      />
                    ))
                  : genres.map((g) => (
                      <FilterChip
                        key={g.id}
                        selected={filter.excludeGenreIds.includes(g.id)}
                        onClick={() => setFilter({ excludeGenreIds: toggle(filter.excludeGenreIds, g.id) })}
                        label={g.name}
                        variant="exclude"
                      />
                    ))
              }
            </IncludeExcludeSection>
          )}

          {/* シチュエーション — 単一選択 */}
          <FilterSection title="シチュエーション" count={filter.situations.length}>
            {SITUATIONS.map((s) => (
              <FilterChip
                key={s}
                selected={filter.situations.includes(s)}
                onClick={() => setFilter({ situations: filter.situations.includes(s) ? [] : [s] })}
                label={SITUATION_LABELS[s]}
              />
            ))}
          </FilterSection>

          {/* 距離 */}
          <FilterSection title="距離で絞り込み" count={filter.nearbyKm !== null ? 1 : 0}>
            <div className="w-full flex flex-col gap-3">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter({ stationName: null })}
                  className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-colors", filter.stationName === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  現在地
                </button>
                <button
                  type="button"
                  onClick={() => setFilter({ stationName: filter.stationName ?? "" })}
                  className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-colors", filter.stationName !== null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
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
                <span className={cn("text-sm font-semibold", filter.nearbyKm !== null ? "text-primary" : "text-muted-foreground")}>
                  {distanceLabel}
                </span>
                {filter.nearbyKm !== null && (
                  <button
                    type="button"
                    onClick={() => setFilter({ nearbyKm: null })}
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

          {/* 地域タグ */}
          {(broadRegions.length > 0 || specificRegions.length > 0) && (
            <FilterSection title="地域タグ" count={filter.regionIds.length}>
              {broadRegions.map((r) => (
                <FilterChip
                  key={r.id}
                  selected={filter.regionIds.includes(r.id)}
                  onClick={() => setFilter({ regionIds: toggle(filter.regionIds, r.id) })}
                  label={r.name}
                />
              ))}
              {specificRegions.length > 0 && (
                <SpecificRegionExpander
                  regions={specificRegions}
                  selectedIds={filter.regionIds}
                  onToggle={(id) => setFilter({ regionIds: toggle(filter.regionIds, id) })}
                />
              )}
            </FilterSection>
          )}

          {/* 予算 */}
          <FilterSection title="予算" count={filter.budgets.length}>
            {BUDGETS.map((b) => (
              <FilterChip
                key={b}
                selected={filter.budgets.includes(b)}
                onClick={() => setFilter({ budgets: toggle(filter.budgets, b) })}
                label={BUDGET_LABELS[b]}
              />
            ))}
          </FilterSection>

          {/* 所要時間 */}
          <FilterSection title="所要時間" count={filter.durations.length}>
            {DURATIONS.map((d) => (
              <FilterChip
                key={d}
                selected={filter.durations.includes(d)}
                onClick={() => setFilter({ durations: toggle(filter.durations, d) })}
                label={DURATION_LABELS[d]}
              />
            ))}
          </FilterSection>

          {/* 季節 */}
          <FilterSection title="季節タグ" collapsible defaultOpen={filter.seasons.length > 0} count={filter.seasons.length}>
            {SEASONS.map((s) => (
              <FilterChip
                key={s}
                selected={filter.seasons.includes(s)}
                onClick={() => setFilter({ seasons: toggle(filter.seasons, s) })}
                label={SEASON_LABELS[s]}
              />
            ))}
          </FilterSection>

          {/* 登録者 */}
          {members.length > 0 && (
            <FilterSection title="登録者" collapsible defaultOpen={filter.memberIds.length > 0} count={filter.memberIds.length}>
              {members.map((m) => (
                <FilterChip
                  key={m.id}
                  selected={filter.memberIds.includes(m.id)}
                  onClick={() => setFilter({ memberIds: toggle(filter.memberIds, m.id) })}
                  label={m.nickname}
                />
              ))}
            </FilterSection>
          )}
        </div>

        <div className="flex gap-2 mt-4 pb-8">
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
