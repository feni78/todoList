export type Priority = "MAX" | "GOLD" | "SILVER" | "BRONZE";
export type Situation = "HOME" | "OUTSIDE" | "EITHER";
export type Status = "PENDING" | "DONE" | "HOLD";
export type Budget = "FREE" | "UNDER_3000" | "UNDER_10000" | "OVER_10000";
export type Duration = "WITHIN_30MIN" | "ONE_TWO_HOUR" | "HALF_DAY" | "FULL_DAY";
export type Season = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";

export interface Wish {
  id: string;
  groupId: string;
  memberId: string;
  title: string;
  priority: Priority;
  situation: Situation;
  status: Status;
  memo?: string;
  budget?: Budget;
  duration?: Duration;
  seasons: Season[];
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    nickname: string;
  };
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  nickname: string;
}

export interface WishHistory {
  id: string;
  wishId: string;
  memberId: string;
  doneAt: string;
  comment?: string;
  wish: Pick<Wish, "id" | "title">;
  member: Pick<GroupMember, "id" | "nickname">;
}

export interface RouletteSettings {
  considerLevel: number;
  weightMax: number;
  weightGold: number;
  weightSilver: number;
  weightBronze: number;
}

export interface FilterState {
  memberIds: string[];
  situations: Situation[];
  statuses: Status[];
  budgets: Budget[];
  durations: Duration[];
  seasons: Season[];
  searchQuery: string;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  MAX: "MAX",
  GOLD: "金",
  SILVER: "銀",
  BRONZE: "銅",
};

export const PRIORITY_ICONS: Record<Priority, string> = {
  MAX: "🏆",
  GOLD: "🥇",
  SILVER: "🥈",
  BRONZE: "🥉",
};

export const SITUATION_LABELS: Record<Situation, string> = {
  HOME: "家",
  OUTSIDE: "外",
  EITHER: "どちらでも",
};

export const SITUATION_ICONS: Record<Situation, string> = {
  HOME: "🏠",
  OUTSIDE: "🚶",
  EITHER: "↔️",
};

export const STATUS_LABELS: Record<Status, string> = {
  PENDING: "未実施",
  DONE: "実施済み",
  HOLD: "保留",
};

export const BUDGET_LABELS: Record<Budget, string> = {
  FREE: "0円",
  UNDER_3000: "〜1,000円",
  UNDER_10000: "〜5,000円",
  OVER_10000: "5,000円以上",
};

export const DURATION_LABELS: Record<Duration, string> = {
  WITHIN_30MIN: "30分以内",
  ONE_TWO_HOUR: "1〜2時間",
  HALF_DAY: "半日",
  FULL_DAY: "1日",
};

export const SEASON_LABELS: Record<Season, string> = {
  SPRING: "春",
  SUMMER: "夏",
  AUTUMN: "秋",
  WINTER: "冬",
};
