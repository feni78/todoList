"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { Wish, PRIORITY_ICONS } from "@/types";

interface RouletteSpecialProps {
  wishes: Wish[];
  isSpinning: boolean;
  result: Wish | null;
  pendingResult: Wish | null;
}

const ITEM_HEIGHT = 64;
const VISIBLE = 5;
const REPEATS = 22;

export function RouletteSpecial({ wishes, isSpinning, result, pendingResult }: RouletteSpecialProps) {
  const controls = useAnimation();
  const prevSpinning = useRef(false);
  const count = wishes.length;

  useEffect(() => {
    if (isSpinning && !prevSpinning.current && count > 0 && pendingResult) {
      prevSpinning.current = true;

      const resultIndex = wishes.findIndex((w) => w.id === pendingResult.id);
      if (resultIndex < 0) return;

      // 上から下に流れる：startY（大きな負値）→ targetY（小さな負値）
      // 3周分オフセットして上下に確実にアイテムが表示されるようにする
      const centerOffset = Math.floor(VISIBLE / 2);
      const targetY = -((resultIndex + 3 * count - centerOffset) * ITEM_HEIGHT);
      const startY = targetY - 14 * count * ITEM_HEIGHT;

      controls.set({ y: startY });
      controls.start({
        y: targetY,
        transition: { duration: 8.5, ease: [0.05, 1.0, 0.95, 1] },
      });
    }
    if (!isSpinning) {
      prevSpinning.current = false;
    }
  }, [isSpinning, pendingResult, wishes, count, controls]);

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <span className="text-4xl mb-2">🎰</span>
        <p className="text-sm">条件に合うアイテムがありません</p>
      </div>
    );
  }

  const repeatedItems = Array.from({ length: REPEATS }, () => wishes).flat();

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-lg"
        style={{ width: 280, height: ITEM_HEIGHT * VISIBLE }}
      >
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-background/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />
          <div
            className="absolute inset-x-0 border-y-2 border-primary/40"
            style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }}
          />
        </div>

        <motion.div animate={controls} style={{ willChange: "transform" }}>
          {repeatedItems.map((wish, i) => (
            <div
              key={`${wish.id}-${i}`}
              className="flex items-center gap-3 px-4"
              style={{ height: ITEM_HEIGHT }}
            >
              <span className="text-2xl">{PRIORITY_ICONS[wish.priority]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{wish.title}</p>
                <p className="text-xs text-muted-foreground">{wish.member.nickname}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {result && !isSpinning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-card border border-border rounded-2xl px-6 py-4 shadow-sm w-full max-w-[280px]"
        >
          <p className="text-xs text-muted-foreground mb-1">結果</p>
          <p className="text-lg font-bold">{result.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {PRIORITY_ICONS[result.priority]} {result.member.nickname}
          </p>
        </motion.div>
      )}
    </div>
  );
}
