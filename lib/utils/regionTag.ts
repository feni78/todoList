export const BROAD_TAG_NAMES = new Set([
  "東京23区", "東京市部", "神奈川", "千葉", "埼玉", "茨城", "旅行先",
]);

export function isBroadRegionTag(name: string): boolean {
  return BROAD_TAG_NAMES.has(name);
}

// 東京都の島しょ部（旅行先扱い）
const TOKYO_ISLAND_CITIES = new Set([
  "大島町", "利島村", "新島村", "神津島村", "三宅村", "御蔵島村",
  "八丈町", "青ヶ島村", "小笠原村",
]);

// 東京23区
const TOKYO_23KU = new Set([
  "千代田区", "中央区", "港区", "新宿区", "文京区", "台東区",
  "墨田区", "江東区", "品川区", "目黒区", "大田区", "世田谷区",
  "渋谷区", "中野区", "杉並区", "豊島区", "北区", "荒川区",
  "板橋区", "練馬区", "足立区", "葛飾区", "江戸川区",
]);

export function toBroadRegionTag(prefecture: string, city: string): string {
  if (prefecture === "東京都") {
    if (TOKYO_ISLAND_CITIES.has(city)) return "旅行先";
    if (TOKYO_23KU.has(city)) return "東京23区";
    return "東京市部";
  }
  const map: Record<string, string> = {
    "神奈川県": "神奈川",
    "千葉県": "千葉",
    "埼玉県": "埼玉",
    "茨城県": "茨城",
  };
  return map[prefecture] ?? "旅行先";
}

export function toSpecificRegionTag(prefecture: string, city: string): string {
  return `${prefecture}${city}`;
}
