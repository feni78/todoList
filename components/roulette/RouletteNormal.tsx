"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface RouletteNormalProps {
  wishes: Wish[];
  isSpinning: boolean;
  result: Wish | null;
  pendingResult: Wish | null;
  probabilities?: Map<string, number> | null;
}

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
];

const MAX_WHEEL = 100;

export function RouletteNormal({ wishes, isSpinning, result, pendingResult, probabilities }: RouletteNormalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useAnimation();
  const prevSpinning = useRef(isSpinning);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (result && !isSpinning) {
      const t = setTimeout(() => setShowResult(true), 400);
      return () => clearTimeout(t);
    } else {
      setShowResult(false);
    }
  }, [result, isSpinning]);
  const count = wishes.length;
  const tooMany = count > MAX_WHEEL;

  // 件数が多い場合は先頭 MAX_WHEEL 件のみ描画（回転アニメーション用の見た目）
  const displayWishes = tooMany ? wishes.slice(0, MAX_WHEEL) : wishes;
  const displayCount = displayWishes.length;

  const drawCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;
    const items = displayWishes.length > 0 ? displayWishes : [{ id: "empty", title: "アイテムなし" }];
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
      if (items.length <= 30) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (!tooMany) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        const fontSize = Math.max(10, 14 - items.length);
        ctx.font = `bold ${fontSize}px sans-serif`;
        const title = "title" in item ? (item as { title: string }).title : "";
        const prob = probabilities?.get("id" in item ? (item as { id: string }).id : "") ?? null;
        const titleY = prob !== null ? -2 : 5;
        ctx.fillText(title.length > 8 ? title.slice(0, 8) + "…" : title, r - 10, titleY);
        if (prob !== null) {
          ctx.font = `${Math.max(8, fontSize - 2)}px sans-serif`;
          ctx.fillText(`${(prob * 100).toFixed(1)}%`, r - 10, titleY + fontSize);
        }
        ctx.restore();
      }
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }, [displayWishes, probabilities, tooMany]);

  useEffect(() => {
    if (isSpinning && !prevSpinning.current && pendingResult && displayCount > 0) {
      prevSpinning.current = true;

      let target: number;
      if (tooMany) {
        // 件数超過時はランダム角度でスピン（結果はテキストで表示）
        target = 3 * 360 + Math.random() * 360;
      } else {
        const resultIndex = displayWishes.findIndex((w) => w.id === pendingResult.id);
        if (resultIndex < 0) {
          target = 3 * 360 + Math.random() * 360;
        } else {
          const segmentAngle = 360 / displayCount;
          const segmentCenter = (resultIndex + 0.5) * segmentAngle;
          target = 3 * 360 + (360 - (segmentCenter % 360));
        }
      }

      controls.set({ rotate: 0 });
      controls.start({
        rotate: target,
        transition: { duration: 3.5, ease: [0.2, 0.8, 0.4, 1] },
      });
    }
    if (!isSpinning) {
      prevSpinning.current = false;
      if (!result) controls.stop();
    }
  }, [isSpinning, pendingResult, displayWishes, displayCount, tooMany, controls, result]);

  if (wishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <span className="text-4xl mb-2">🎡</span>
        <p className="text-sm">条件に合うアイテムがありません</p>
      </div>
    );
  }

  // 結果確定後：件数が少ない場合のみ結果角度に回転
  const staticRotate = (() => {
    if (!result || isSpinning || tooMany) return null;
    const resultIndex = displayWishes.findIndex((w) => w.id === result.id);
    if (resultIndex < 0) return null;
    const segmentAngle = 360 / displayCount;
    const segmentCenter = (resultIndex + 0.5) * segmentAngle;
    return 360 - (segmentCenter % 360);
  })();

  return (
    <div className="flex flex-col items-center gap-4">
      {tooMany && (
        <p className="text-xs text-muted-foreground">
          {count}件中 {MAX_WHEEL}件を表示（抽選は全件対象）
        </p>
      )}
      <div className="relative" style={{ width: 280, height: 280 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-foreground" />
        </div>
        {staticRotate !== null ? (
          <div style={{ transform: `rotate(${staticRotate}deg)` }}>
            <canvas ref={drawCanvas} width={280} height={280} className="rounded-full shadow-lg" />
          </div>
        ) : (
          <motion.div animate={controls} style={{ willChange: "transform" }}>
            <canvas ref={drawCanvas} width={280} height={280} className="rounded-full shadow-lg" />
          </motion.div>
        )}
      </div>

      {showResult && result && (
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
          <ResultLinks memo={result.memo} />
        </motion.div>
      )}
    </div>
  );
}
