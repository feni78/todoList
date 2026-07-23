"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { drawWish } from "@/lib/utils/roulette";
import { haversineKm } from "@/lib/utils/distance";
import { Wish } from "@/types";

export function useRoulette(wishes: Wish[], userLocation?: { lat: number; lng: number } | null) {
  const {
    settings, filter,
    result, setResult,
    isSpinning, setIsSpinning,
    pendingResult, setPendingResult,
    spinEndAt, setSpinEndAt,
    spinId, setSpinId,
  } = useRouletteStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredWishes = useMemo(() => wishes.filter((w) => {
    if (filter.memberIds.length > 0 && !filter.memberIds.includes(w.memberId)) return false;
    if (filter.situations.length > 0 && !filter.situations.includes(w.situation)) return false;
    if (filter.statuses.length > 0 && !filter.statuses.includes(w.status)) return false;
    if (filter.budgets.length > 0 && w.budget && !filter.budgets.includes(w.budget)) return false;
    if (filter.durations.length > 0 && w.duration && !filter.durations.includes(w.duration)) return false;
    if (filter.seasons.length > 0) {
      if (!w.seasons.some((s) => filter.seasons.includes(s))) return false;
    }
    if (filter.genreIds.length > 0) {
      if (!w.genres.some((g) => filter.genreIds.includes(g.id))) return false;
    }
    if (filter.excludeGenreIds.length > 0) {
      if (w.genres.some((g) => filter.excludeGenreIds.includes(g.id))) return false;
    }
    if (filter.regionIds.length > 0 && !w.regions.some((r) => filter.regionIds.includes(r.id))) return false;
    if (filter.excludeRegionIds.length > 0 && w.regions.some((r) => filter.excludeRegionIds.includes(r.id))) return false;
    if (filter.nearbyKm !== null) {
      if (!userLocation || w.latitude == null || w.longitude == null) return false;
      if (haversineKm(userLocation.lat, userLocation.lng, w.latitude, w.longitude) > filter.nearbyKm) return false;
    }
    return true;
  }), [wishes, filter, userLocation]);

  // スピンIDが一致する場合だけ完了する（古いタイマーの誤発火を防ぐ）
  const complete = useCallback((drawn: Wish | null, expectedId: number) => {
    const currentId = useRouletteStore.getState().spinId;
    if (currentId !== expectedId) return;
    setResult(drawn);
    setIsSpinning(false);
    setPendingResult(null);
    setSpinEndAt(null);
  }, [setResult, setIsSpinning, setPendingResult, setSpinEndAt]);

  // マウント時：スピン中なら即完了
  useEffect(() => {
    if (!isSpinning || spinEndAt === null) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    complete(pendingResult, spinId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タブ復帰時：即完了
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const state = useRouletteStore.getState();
        if (state.isSpinning && state.spinEndAt !== null) {
          if (timerRef.current) clearTimeout(timerRef.current);
          complete(state.pendingResult, state.spinId);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [complete]);

  const spin = useCallback(
    (duration = 3500) => {
      if (isSpinning) return;
      const drawn = drawWish(filteredWishes, settings);
      const endAt = Date.now() + duration;
      const newId = Date.now();
      setSpinId(newId);
      setIsSpinning(true);
      setResult(null);
      setPendingResult(drawn);
      setSpinEndAt(endAt);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => complete(drawn, newId), duration);
    },
    [filteredWishes, settings, isSpinning, setIsSpinning, setResult, setPendingResult, setSpinEndAt, setSpinId, complete]
  );

  const completeNow = useCallback(() => {
    const state = useRouletteStore.getState();
    if (!state.isSpinning || state.spinEndAt === null) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    complete(state.pendingResult, state.spinId);
  }, [complete]);

  return { spin, result, isSpinning, filteredWishes, pendingResult, completeNow };
}
