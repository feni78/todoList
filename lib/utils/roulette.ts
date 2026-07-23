import { Wish, RouletteSettings } from "@/types";

function getPool(wishes: Wish[], considerLevel: number): Wish[] {
  if (considerLevel === 100 && wishes.length > 0) {
    const maxScore = Math.max(...wishes.map((w) => w.avgScore));
    return wishes.filter((w) => w.avgScore === maxScore);
  }
  return wishes;
}

function calcWeight(avgScore: number, considerLevel: number): number {
  const s = Math.max(avgScore, 5) / 100; // 正規化（未投票は5/100=0.05）
  const power = (considerLevel / 100) * 2; // 0%→0, 50%→1, 100%→2
  return Math.pow(s, power);
}

export function computeProbabilities(wishes: Wish[], settings: RouletteSettings): Map<string, number> {
  const map = new Map<string, number>();
  if (wishes.length === 0) return map;
  const { considerLevel } = settings;
  const pool = getPool(wishes, considerLevel);

  const weighted = pool.map((w) => ({ wish: w, weight: calcWeight(w.avgScore, considerLevel) }));
  const total = weighted.reduce((s, { weight }) => s + weight, 0);

  wishes.forEach((w) => map.set(w.id, 0));
  weighted.forEach(({ wish, weight }) => map.set(wish.id, weight / total));
  return map;
}

export function drawWish(wishes: Wish[], settings: RouletteSettings): Wish | null {
  if (wishes.length === 0) return null;
  const { considerLevel } = settings;
  const pool = getPool(wishes, considerLevel);

  const weighted = pool.map((w) => ({ wish: w, weight: calcWeight(w.avgScore, considerLevel) }));
  const total = weighted.reduce((sum, { weight }) => sum + weight, 0);
  let rand = Math.random() * total;

  for (const { wish, weight } of weighted) {
    rand -= weight;
    if (rand <= 0) return wish;
  }

  return weighted[weighted.length - 1].wish;
}
