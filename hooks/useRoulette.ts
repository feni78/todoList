"use client";

import { useCallback } from "react";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { drawWish } from "@/lib/utils/roulette";
import { Wish } from "@/types";

export function useRoulette(wishes: Wish[]) {
  const { settings, filter, setResult, setIsSpinning, isSpinning, result } = useRouletteStore();

  const filteredWishes = wishes.filter((w) => {
    if (filter.memberIds.length > 0 && !filter.memberIds.includes(w.memberId)) return false;
    if (filter.situations.length > 0 && !filter.situations.includes(w.situation)) return false;
    if (filter.statuses.length > 0 && !filter.statuses.includes(w.status)) return false;
    if (filter.budgets.length > 0 && w.budget && !filter.budgets.includes(w.budget)) return false;
    if (filter.durations.length > 0 && w.duration && !filter.durations.includes(w.duration)) return false;
    if (filter.seasons.length > 0) {
      const hasMatchingSeason = w.seasons.some((s) => filter.seasons.includes(s));
      if (!hasMatchingSeason) return false;
    }
    return true;
  });

  const spin = useCallback(
    (onComplete?: (wish: Wish | null) => void) => {
      if (isSpinning) return;
      const drawn = drawWish(filteredWishes, settings);
      setIsSpinning(true);
      setResult(null);

      setTimeout(() => {
        setResult(drawn);
        setIsSpinning(false);
        onComplete?.(drawn);
      }, 3500);
    },
    [filteredWishes, settings, isSpinning, setIsSpinning, setResult]
  );

  return { spin, result, isSpinning, filteredWishes };
}
