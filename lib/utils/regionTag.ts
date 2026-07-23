// 全都道府県リスト（前方一致で抽出するため長い名前を先に）
const ALL_PREFECTURES: string[] = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
  "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

// 都道府県コード順（優先グループ以外）
const PREFECTURE_JIS_ORDER: string[] = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "栃木県", "群馬県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
  "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

function extractPrefecture(name: string): string | null {
  return ALL_PREFECTURES.find((p) => name.startsWith(p)) ?? null;
}

export function specificRegionSortKey(name: string): [number, string] {
  const pref = extractPrefecture(name);
  const city = pref ? name.slice(pref.length) : "";
  if (pref === "千葉県") return [0, name];
  if (pref === "東京都" && TOKYO_23KU.has(city)) return [1, name];
  if (pref === "埼玉県") return [2, name];
  if (pref === "神奈川県") return [3, name];
  if (pref === "東京都") return [4, name];
  if (pref === "茨城県") return [5, name];
  if (pref) {
    const idx = PREFECTURE_JIS_ORDER.indexOf(pref);
    if (idx >= 0) return [6 + idx, name];
  }
  return [999, name];
}

// グループ番号 → 選択済み / 未選択のTailwindクラス
const REGION_GROUP_COLORS: Record<number, { selected: string; unselected: string }> = {
  0: { selected: "bg-amber-300 text-amber-900",         unselected: "bg-amber-100 text-amber-700 hover:bg-amber-200" },   // 千葉
  1: { selected: "bg-blue-300 text-blue-900",           unselected: "bg-blue-100 text-blue-700 hover:bg-blue-200" },      // 東京23区
  2: { selected: "bg-green-300 text-green-900",         unselected: "bg-green-100 text-green-700 hover:bg-green-200" },   // 埼玉
  3: { selected: "bg-teal-300 text-teal-900",           unselected: "bg-teal-100 text-teal-700 hover:bg-teal-200" },      // 神奈川
  4: { selected: "bg-violet-300 text-violet-900",       unselected: "bg-violet-100 text-violet-700 hover:bg-violet-200" },// 東京市部
  5: { selected: "bg-orange-300 text-orange-900",       unselected: "bg-orange-100 text-orange-700 hover:bg-orange-200" },// 茨城
};

export function specificRegionColorClasses(name: string, selected: boolean): string {
  const [group] = specificRegionSortKey(name);
  const colors = REGION_GROUP_COLORS[group];
  if (!colors) return selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80";
  return selected ? colors.selected : colors.unselected;
}

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
