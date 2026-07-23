"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { RouletteNormal } from "@/components/roulette/RouletteNormal";
import { RouletteSpecial } from "@/components/roulette/RouletteSpecial";
import { RouletteFilter } from "@/components/roulette/RouletteFilter";
import { Button } from "@/components/ui/button";
import { useWishes } from "@/hooks/useWishes";
import { useRoulette } from "@/hooks/useRoulette";
import { useGenres } from "@/hooks/useGenres";
import { useRegions } from "@/hooks/useRegions";
import { useGroupStore } from "@/lib/store/groupStore";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { SlidersHorizontal, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { computeProbabilities } from "@/lib/utils/roulette";
import { findStation } from "@/lib/utils/station";

type RouletteMode = "normal" | "special";

export default function RoulettePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const group = useGroupStore((s) => s.group);
  const { wishes, changeStatus } = useWishes(uuid);
  const { genres } = useGenres(uuid);
  const { regions } = useRegions(uuid);
  const { mode, setMode, settings, devMode, filter } = useRouletteStore();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const nearbyKmRef = useRef<number | null>(null);
  const { spin, result, isSpinning, filteredWishes, pendingResult, completeNow } = useRoulette(wishes, userLocation, regions);
  const probabilities = devMode ? computeProbabilities(filteredWishes, settings) : null;
  const [filterOpen, setFilterOpen] = useState(false);
  const [specialAnimDone, setSpecialAnimDone] = useState(true);
  const [showResultUI, setShowResultUI] = useState(false);

  useEffect(() => {
    if (result && !isSpinning && specialAnimDone) {
      const t = setTimeout(() => setShowResultUI(true), 200);
      return () => clearTimeout(t);
    } else {
      setShowResultUI(false);
    }
  }, [result, isSpinning, specialAnimDone]);

  useEffect(() => {
    const km = filter.nearbyKm;
    const stationName = filter.stationName;
    nearbyKmRef.current = km;
    if (km === null) { setUserLocation(null); return; }

    if (stationName !== null) {
      const station = findStation(stationName);
      if (station) {
        setUserLocation({ lat: station.lat, lng: station.lng });
      } else {
        setUserLocation(null);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (nearbyKmRef.current !== km) return;
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { toast.error("位置情報の取得を許可してください"); setUserLocation(null); }
    );
  }, [filter.nearbyKm, filter.stationName]);

  const hasActiveFilters =
    filter.memberIds.length > 0 ||
    filter.situations.length > 0 ||
    filter.budgets.length > 0 ||
    filter.durations.length > 0 ||
    filter.seasons.length > 0 ||
    filter.genreIds.length > 0 ||
    filter.excludeGenreIds.length > 0 ||
    filter.regionIds.length > 0 ||
    filter.nearbyKm !== null;

  const handleSetMode = (m: RouletteMode) => {
    if (isSpinning) completeNow();
    setMode(m);
  };

  const handleSpin = () => {
    if (filteredWishes.length === 0) {
      toast.error("条件に合うアイテムがありません");
      return;
    }
    if (mode === "special") setSpecialAnimDone(false);
    spin(mode === "special" ? 10000 : 3500);
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
            className={cn(
              "p-2 rounded-lg transition-colors",
              hasActiveFilters ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
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
            probabilities={probabilities}
          />
        ) : (
          <RouletteSpecial
            wishes={filteredWishes}
            isSpinning={isSpinning}
            result={result}
            pendingResult={pendingResult}
            probabilities={probabilities}
            onAnimDone={() => setSpecialAnimDone(true)}
          />
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => handleSpin()}
            disabled={isSpinning || !specialAnimDone || (result !== null && !showResultUI) || filteredWishes.length === 0}
            size="lg"
            className="w-full rounded-full text-base font-bold h-14 shadow-lg"
          >
            {isSpinning || !specialAnimDone || (result !== null && !showResultUI) ? "回転中..." : showResultUI ? (
              <><RefreshCw size={18} className="mr-2" />もう一度</>
            ) : "スタート！"}
          </Button>

          {showResultUI && (
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
        genres={genres}
        regions={regions}
      />

      <BottomNav groupId={uuid} />
    </div>
  );
}
