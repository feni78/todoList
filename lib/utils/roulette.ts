import { Wish, RouletteSettings } from "@/types";

export function drawWish(wishes: Wish[], settings: RouletteSettings): Wish | null {
  if (wishes.length === 0) return null;
  const { considerLevel } = settings;

  const blendFactor = considerLevel / 100;
  const pool = considerLevel === 100 && wishes.some((w) => w.hasMaxVote)
    ? wishes.filter((w) => w.hasMaxVote)
    : wishes;

  const weighted = pool.map((wish) => {
    const score = wish.avgScore > 0 ? wish.avgScore : 5;
    const weight = 1 * (1 - blendFactor) + score * blendFactor;
    return { wish, weight };
  });

  const totalWeight = weighted.reduce((sum, { weight }) => sum + weight, 0);
  let rand = Math.random() * totalWeight;

  for (const { wish, weight } of weighted) {
    rand -= weight;
    if (rand <= 0) return wish;
  }

  return weighted[weighted.length - 1].wish;
}
