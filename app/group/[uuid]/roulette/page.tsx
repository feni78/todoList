"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { RouletteNormal } from "@/components/roulette/RouletteNormal";
import { RouletteSpecial } from "@/components/roulette/RouletteSpecial";
import { RouletteFilter } from "@/components/roulette/RouletteFilter";
import { Button } from "@/components/ui/button";
import { useWishes } from "@/hooks/useWishes";
import { useRoulette } from "@/hooks/useRoulette";
import { useGroupStore } from "@/lib/store/groupStore";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { SlidersHorizontal, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RouletteMode = "normal" | "special";

export default function RoulettePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const group = useGroupStore((s) => s.group);
  const { wishes, changeStatus } = useWishes(uuid);
  const { mode, setMode } = useRouletteStore();
  const { spin, result, isSpinning, filteredWishes, pendingResult, completeNow } = useRoulette(wishes);
  const [filterOpen, setFilterOpen] = useState(false);

  const handleSetMode = (m: RouletteMode) => {
    if (isSpinning) completeNow();
    setMode(m);
  };

  const handleSpin = () => {
    if (filteredWishes.length === 0) {
      toast.error("条件に合うアイテムがありません");
      return;
    }
    spin(mode === "special" ? 8500 : 3500);
  };


  const handleDone = async () => {
    if (!result) return;
    try {
      await changeStatus(result.id, "DONE");
      toast.success("実施済みにしました！");
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-16 overflow-hidden">
      <TopBar
        title="ルーレット"
        right={
          <button
            onClick={() => setFilterOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal size={18} />
          </button>
        }
      />

      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border">
        {(["normal", "special"] as RouletteMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleSetMode(m)}
            className={cn(
              "w-28 py-1.5 rounded-lg text-xs font-medium transition-colors",
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {m === "normal" ? "🎡 Normal" : "🎰 Special"}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-6 overflow-hidden">
        {mode === "normal" ? (
          <RouletteNormal
            wishes={filteredWishes}
            isSpinning={isSpinning}
            result={result}
            pendingResult={pendingResult}
          />
        ) : (
          <RouletteSpecial
            wishes={filteredWishes}
            isSpinning={isSpinning}
            result={result}
            pendingResult={pendingResult}
          />
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => handleSpin()}
            disabled={isSpinning || filteredWishes.length === 0}
            size="lg"
            className="w-full rounded-full text-base font-bold h-14 shadow-lg"
          >
            {isSpinning ? "回転中..." : result ? (
              <><RefreshCw size={18} className="mr-2" />もう一度</>
            ) : "スタート！"}
          </Button>

          {result && !isSpinning && (
            <Button
              variant="outline"
              onClick={handleDone}
              className="w-full"
            >
              実施済みにする
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          対象: {filteredWishes.length}件
        </p>
      </div>

      <RouletteFilter
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        members={group?.members ?? []}
      />

      <BottomNav groupId={uuid} />
    </div>
  );
}
