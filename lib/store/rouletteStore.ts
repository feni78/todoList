import { create } from "zustand";
import { RouletteSettings, FilterState, Wish, Status, Budget, Duration, Season } from "@/types";

type RouletteMode = "normal" | "special";

interface RouletteFilter extends Omit<FilterState, "statuses" | "searchQuery"> {
  statuses: Status[];
  favoriteOnly: boolean;
}

interface RouletteState {
  mode: RouletteMode;
  settings: RouletteSettings;
  filter: RouletteFilter;
  defaultExcludeGenreIds: string[];
  defaultExcludeRegionIds: string[];
  result: Wish | null;
  isSpinning: boolean;
  pendingResult: Wish | null;
  spinEndAt: number | null;
  spinId: number;
  devMode: boolean;
  setMode: (mode: RouletteMode) => void;
  setSettings: (settings: RouletteSettings) => void;
  setFilter: (filter: Partial<RouletteFilter>) => void;
  setDefaultExcludeGenreIds: (ids: string[]) => void;
  setDefaultExcludeRegionIds: (ids: string[]) => void;
  setResult: (wish: Wish | null) => void;
  setIsSpinning: (spinning: boolean) => void;
  setPendingResult: (wish: Wish | null) => void;
  setSpinEndAt: (ts: number | null) => void;
  setSpinId: (id: number) => void;
  setDevMode: (v: boolean) => void;
  resetFilter: () => void;
}

const defaultSettings: RouletteSettings = {
  considerLevel: 50,
};

const defaultFilter: RouletteFilter = {
  memberIds: [],
  situations: [],
  statuses: ["PENDING"],
  budgets: [],
  durations: [],
  seasons: [],
  scoreFilter: null,
  genreIds: [],
  genreSearchMode: "OR",
  excludeGenreIds: [],
  regionIds: [],
  excludeRegionIds: [],
  nearbyKm: null,
  stationName: null,
  favoriteOnly: false,
};

export const useRouletteStore = create<RouletteState>((set) => ({
  mode: "normal",
  settings: defaultSettings,
  filter: defaultFilter,
  defaultExcludeGenreIds: [],
  defaultExcludeRegionIds: [],
  result: null,
  isSpinning: false,
  pendingResult: null,
  spinEndAt: null,
  spinId: 0,
  devMode: false,
  setMode: (mode) => set({ mode }),
  setSettings: (settings) => set({ settings }),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  setDefaultExcludeGenreIds: (ids) => set({ defaultExcludeGenreIds: ids }),
  setDefaultExcludeRegionIds: (ids) => set({ defaultExcludeRegionIds: ids }),
  setResult: (result) => set({ result }),
  setIsSpinning: (isSpinning) => set({ isSpinning }),
  setPendingResult: (pendingResult) => set({ pendingResult }),
  setSpinEndAt: (spinEndAt) => set({ spinEndAt }),
  setSpinId: (spinId) => set({ spinId }),
  setDevMode: (devMode) => set({ devMode }),
  resetFilter: () => set((s) => ({
    filter: {
      ...defaultFilter,
      excludeGenreIds: [...s.defaultExcludeGenreIds],
      excludeRegionIds: [...s.defaultExcludeRegionIds],
    },
  })),
}));
