import { create } from "zustand";
import { FilterState, Situation, Status, Budget, Duration, Season } from "@/types";

interface FilterStore extends FilterState {
  defaultExcludeGenreIds: string[];
  setDefaultExcludeGenreIds: (ids: string[]) => void;
  setMemberIds: (ids: string[]) => void;
  setSituations: (s: Situation[]) => void;
  setStatuses: (s: Status[]) => void;
  setBudgets: (b: Budget[]) => void;
  setDurations: (d: Duration[]) => void;
  setSeasons: (s: Season[]) => void;
  setGenreIds: (ids: string[]) => void;
  setGenreSearchMode: (mode: "OR" | "AND") => void;
  setExcludeGenreIds: (ids: string[]) => void;
  setSearchQuery: (q: string) => void;
  reset: () => void;
}

const initialState: FilterState = {
  memberIds: [],
  situations: [],
  statuses: [],
  budgets: [],
  durations: [],
  seasons: [],
  genreIds: [],
  genreSearchMode: "OR",
  excludeGenreIds: [],
  searchQuery: "",
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,
  defaultExcludeGenreIds: [],
  setDefaultExcludeGenreIds: (defaultExcludeGenreIds) => set({ defaultExcludeGenreIds }),
  setMemberIds: (memberIds) => set({ memberIds }),
  setSituations: (situations) => set({ situations }),
  setStatuses: (statuses) => set({ statuses }),
  setBudgets: (budgets) => set({ budgets }),
  setDurations: (durations) => set({ durations }),
  setSeasons: (seasons) => set({ seasons }),
  setGenreIds: (genreIds) => set({ genreIds }),
  setGenreSearchMode: (genreSearchMode) => set({ genreSearchMode }),
  setExcludeGenreIds: (excludeGenreIds) => set({ excludeGenreIds }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  // リセット時はデフォルト除外ジャンルを維持する
  reset: () => set((state) => ({ ...initialState, defaultExcludeGenreIds: state.defaultExcludeGenreIds, excludeGenreIds: [...state.defaultExcludeGenreIds] })),
}));
