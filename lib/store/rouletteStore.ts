import { create } from "zustand";
import { RouletteSettings, FilterState, Wish, Situation, Status, Budget, Duration, Season } from "@/types";

type RouletteMode = "normal" | "special";

interface RouletteFilter extends Omit<FilterState, "statuses" | "searchQuery"> {
  statuses: Status[];
}

interface RouletteState {
  mode: RouletteMode;
  settings: RouletteSettings;
  filter: RouletteFilter;
  result: Wish | null;
  isSpinning: boolean;
  setMode: (mode: RouletteMode) => void;
  setSettings: (settings: RouletteSettings) => void;
  setFilter: (filter: Partial<RouletteFilter>) => void;
  setResult: (wish: Wish | null) => void;
  setIsSpinning: (spinning: boolean) => void;
}

const defaultSettings: RouletteSettings = {
  considerLevel: 50,
  weightMax: 100,
  weightGold: 30,
  weightSilver: 10,
  weightBronze: 5,
};

const defaultFilter: RouletteFilter = {
  memberIds: [],
  situations: [],
  statuses: ["PENDING"],
  budgets: [],
  durations: [],
  seasons: [],
};

export const useRouletteStore = create<RouletteState>((set) => ({
  mode: "normal",
  settings: defaultSettings,
  filter: defaultFilter,
  result: null,
  isSpinning: false,
  setMode: (mode) => set({ mode }),
  setSettings: (settings) => set({ settings }),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  setResult: (result) => set({ result }),
  setIsSpinning: (isSpinning) => set({ isSpinning }),
}));
