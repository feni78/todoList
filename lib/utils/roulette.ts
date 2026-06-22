import { Wish, RouletteSettings, Priority } from "@/types";

export function drawWish(wishes: Wish[], settings: RouletteSettings): Wish | null {
  if (wishes.length === 0) return null;

  const { considerLevel, weightMax, weightGold, weightSilver, weightBronze } = settings;

  const customWeights: Record<Priority, number> = {
    MAX: weightMax,
    GOLD: weightGold,
    SILVER: weightSilver,
    BRONZE: weightBronze,
  };

  if (considerLevel === 100) {
    const maxWishes = wishes.filter((w) => w.priority === "MAX");
    const pool = maxWishes.length > 0 ? maxWishes : wishes;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const weighted = wishes.map((wish) => {
    const blendFactor = considerLevel / 100;
    const weight = 1 * (1 - blendFactor) + customWeights[wish.priority] * blendFactor;
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
