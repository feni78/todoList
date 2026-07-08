"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { Wish, scoreToIcon } from "@/types";

interface RouletteNormalProps {
  wishes: Wish[];
  isSpinning: boolean;
  result: Wish | null;
  pendingResult: Wish | null;
}

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
];

export function RouletteNormal({ wishes, isSpinning, result, pendingResult }: RouletteNormalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useAnimation();
  const prevSpinning = useRef(isSpinning);
  const count = wishes.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;
    const items = wishes.length > 0 ? wishes : [{ id: "empty", title: "アイテムなし" }];
    const arc = (2 * Math.PI) / items.length;

    ctx.clearRect(0, 0, size, size);

    items.forEach((item, i) => {
      const startAngle = i * arc - Math.PI / 2;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, 14 - items.length)}px sans-serif`;
      const title = "title" in item ? (item as { title: string }).title : "";
      ctx.fillText(title.length > 8 ? title.slice(0, 8) + "…" : title, r - 10, 5);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }, [wishes]);

  useEffect(() => {
    if (isSpinning && !prevSpinning.current && pendingResult && count > 0) {
      prevSpinning.current = true;
      const resultIndex = wishes.findIndex((w) => w.id === pendingResult.id);
      if (resultIndex < 0) return;

      const segmentAngle = 360 / count;
      const segmentCenter = (resultIndex + 0.5) * segmentAngle;
      const target = 3 * 360 + (360 - (segmentCenter % 360));

      controls.set({ rotate: 0 });
      controls.start({
        rotate: target,
        transition: { duration: 3.5, ease: [0.2, 0.8, 0.4, 1] },
      });
    }
    if (!isSpinning) {
      prevSpinning.current = false;
      controls.stop();
    }
  }, [isSpinning, pendingResult, wishes, count, controls]);

  if (wishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <span className="text-4xl mb-2">🎡</span>
        <p className="text-sm">条件に合うアイテムがありません</p>
      </div>
    );
  }

  // 結果確定後：静的にresultの角度を表示
  const staticRotate = (() => {
    if (!result || isSpinning) return null;
    const resultIndex = wishes.findIndex((w) => w.id === result.id);
    if (resultIndex < 0) return null;
    const segmentAngle = 360 / count;
    const segmentCenter = (resultIndex + 0.5) * segmentAngle;
    return 360 - (segmentCenter % 360);
  })();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: 280, height: 280 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-foreground" />
        </div>
        {staticRotate !== null ? (
          <div style={{ transform: `rotate(${staticRotate}deg)` }}>
            <canvas ref={canvasRef} width={280} height={280} className="rounded-full shadow-lg" />
          </div>
        ) : (
          <motion.div animate={controls} style={{ willChange: "transform" }}>
            <canvas ref={canvasRef} width={280} height={280} className="rounded-full shadow-lg" />
          </motion.div>
        )}
      </div>

      {result && !isSpinning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-card border border-border rounded-2xl px-6 py-4 shadow-sm"
        >
          <p className="text-xs text-muted-foreground mb-1">結果</p>
          <p className="text-lg font-bold">{result.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {scoreToIcon(result.avgScore)} {result.member.nickname}
          </p>
        </motion.div>
      )}
    </div>
  );
}
