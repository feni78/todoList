"use client";

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
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { cn } from "@/lib/utils";

interface RouletteFilterProps {
  open: boolean;
  onClose: () => void;
  members: GroupMember[];
  genres?: Genre[];
}

function FilterChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
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

export function RouletteFilter({ open, onClose, members, genres = [] }: RouletteFilterProps) {
  const { filter, setFilter } = useRouletteStore();

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

          {/* やりたい度フィルターはルーレット重み設定で制御するため省略 */}

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

          {genres.length > 0 && (
            <Section title="ジャンル">
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
        </div>

        <div className="mt-6 pb-8">
          <Button onClick={onClose} className="w-full">
            適用
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
