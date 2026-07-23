"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Wish, scoreToIcon } from "@/types";
import { MapPin, ExternalLink } from "lucide-react";

function ResultLinks({ memo }: { memo?: string }) {
  const urls = memo?.match(/https?:\/\/[^\s]+/g) ?? [];
  const googleUrl = urls.find((u) => u.includes("google")) ?? null;
  const otherUrl = urls.find((u) => !u.includes("google")) ?? null;
  if (!googleUrl && !otherUrl) return null;
  return (
    <div className="flex justify-center gap-3 mt-3">
      {otherUrl && (
        <a href={otherUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
          <ExternalLink size={14} />
          <span>リンク</span>
        </a>
      )}
      {googleUrl && (
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
          <MapPin size={14} />
          <span>マップ</span>
        </a>
      )}
    </div>
  );
}

interface RouletteSpecialProps {
  wishes: Wish[];
  isSpinning: boolean;
  result: Wish | null;
  pendingResult: Wish | null;
  probabilities?: Map<string, number> | null;
  onAnimDone?: () => void;
}

const ITEM_HEIGHT = 64;
const VISIBLE = 5;
const MAX_SPIN_ITEMS = 250; // 移動距離の上限（これ以上だと減速が視覚的に見えなくなる）
const MAX_DOM_ITEMS = 2000; // DOM ノード上限

export function RouletteSpecial({ wishes, isSpinning, result, pendingResult, probabilities, onAnimDone }: RouletteSpecialProps) {
  const controls = useAnimation();
  const prevSpinning = useRef(isSpinning);
  const count = wishes.length;
  const repeats = Math.max(4, Math.min(22, Math.ceil(MAX_DOM_ITEMS / count)));
  const [animDone, setAnimDone] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (result && !isSpinning && animDone) {
      const t = setTimeout(() => setShowResult(true), 600);
      return () => clearTimeout(t);
    } else {
      setShowResult(false);
    }
  }, [result, isSpinning, animDone]);

  useEffect(() => {
    if (isSpinning && !prevSpinning.current && count > 0 && pendingResult) {
      prevSpinning.current = true;
      setAnimDone(false);

      const resultIndex = wishes.findIndex((w) => w.id === pendingResult.id);
      if (resultIndex < 0) return;

      const centerOffset = Math.floor(VISIBLE / 2);
      const targetY = -((resultIndex + 3 * count - centerOffset) * ITEM_HEIGHT);
      const spinItems = Math.min(14 * count, MAX_SPIN_ITEMS);
      const startY = targetY - spinItems * ITEM_HEIGHT;

      controls.set({ y: startY });
      controls.start({
        y: targetY,
        transition: { duration: 8.5, ease: [0.05, 1.0, 0.95, 1] },
      });
    }
    if (!isSpinning) {
      prevSpinning.current = false;
      // controls.stop() を呼ばずアニメーションを自然に完了させる
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

  const repeatedItems = Array.from({ length: repeats }, () => wishes).flat();

  // アニメーション完了後のみ静的表示に切り替える
  const staticY = (() => {
    if (!result || isSpinning || !animDone) return null;
    const resultIndex = wishes.findIndex((w) => w.id === result.id);
    if (resultIndex < 0) return null;
    const centerOffset = Math.floor(VISIBLE / 2);
    return -((resultIndex + 3 * count - centerOffset) * ITEM_HEIGHT);
  })();

  const slotItems = repeatedItems.map((wish, i) => (
    <div key={`${wish.id}-${i}`} className="flex items-center gap-3 px-4" style={{ height: ITEM_HEIGHT }}>
      <span className="text-2xl">{scoreToIcon(wish.avgScore)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{wish.title}</p>
        <p className="text-xs text-muted-foreground">
          {wish.member.nickname}
          {probabilities && (
            <span className="ml-1.5 text-primary font-mono">
              {((probabilities.get(wish.id) ?? 0) * 100).toFixed(1)}%
            </span>
          )}
        </p>
      </div>
    </div>
  ));

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

        {staticY !== null ? (
          <div style={{ transform: `translateY(${staticY}px)` }}>
            {slotItems}
          </div>
        ) : (
          <motion.div
            animate={controls}
            style={{ willChange: "transform" }}
            onAnimationComplete={() => { setAnimDone(true); onAnimDone?.(); }}
          >
            {slotItems}
          </motion.div>
        )}
      </div>

      {showResult && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-card border border-border rounded-2xl px-6 py-4 shadow-sm w-full max-w-[280px]"
        >
          <p className="text-xs text-muted-foreground mb-1">結果</p>
          <p className="text-lg font-bold">{result.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {scoreToIcon(result.avgScore)} {result.member.nickname}
          </p>
          <ResultLinks memo={result.memo} />
        </motion.div>
      )}
    </div>
  );
}
