"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { Wish, PRIORITY_ICONS } from "@/types";

interface RouletteSpecialProps {
  wishes: Wish[];
  isSpinning: boolean;
  result: Wish | null;
}

const ITEM_HEIGHT = 64;
const VISIBLE = 5;

export function RouletteSpecial({ wishes, isSpinning, result }: RouletteSpecialProps) {
  const controls = useAnimation();
  const prevSpinning = useRef(false);

  const items = wishes.length > 0 ? wishes : [];

  useEffect(() => {
    if (isSpinning && !prevSpinning.current && items.length > 0) {
      prevSpinning.current = true;
      const loops = 5;
      const totalDistance = loops * items.length * ITEM_HEIGHT + Math.random() * items.length * ITEM_HEIGHT;
      controls.start({
        y: [-totalDistance],
        transition: { duration: 3.5, ease: [0.2, 0.8, 0.4, 1] },
      });
    }
    if (!isSpinning) {
      prevSpinning.current = false;
      if (result) {
        controls.stop();
        controls.set({ y: 0 });
      }
    }
  }, [isSpinning, result, items.length, controls]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <span className="text-4xl mb-2">🎰</span>
        <p className="text-sm">条件に合うアイテムがありません</p>
      </div>
    );
  }

  const repeatedItems = [...items, ...items, ...items, ...items, ...items, ...items];

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

        <motion.div animate={controls} style={{ y: 0 }}>
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
