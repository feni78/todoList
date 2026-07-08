import { create } from "zustand";
import { FilterState, Situation, Status, Budget, Duration, Season } from "@/types";

interface FilterStore extends FilterState {
  setMemberIds: (ids: string[]) => void;
  setSituations: (s: Situation[]) => void;
  setStatuses: (s: Status[]) => void;
  setBudgets: (b: Budget[]) => void;
  setDurations: (d: Duration[]) => void;
  setSeasons: (s: Season[]) => void;
  setGenreIds: (ids: string[]) => void;
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
  searchQuery: "",
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,
  setMemberIds: (memberIds) => set({ memberIds }),
  setSituations: (situations) => set({ situations }),
  setStatuses: (statuses) => set({ statuses }),
  setBudgets: (budgets) => set({ budgets }),
  setDurations: (durations) => set({ durations }),
  setSeasons: (seasons) => set({ seasons }),
  setGenreIds: (genreIds) => set({ genreIds }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set(initialState),
}));
