import { create } from "zustand";
import { Group, GroupMember } from "@/types";
import { SmallGenreSubGroups } from "@/lib/utils/localStorage";

const DEFAULT_SUBGROUPS: SmallGenreSubGroups = {
  group1Name: "グループ①",
  group2Name: "グループ②",
  group2Ids: [],
};

interface GroupState {
  group: Group | null;
  currentMember: GroupMember | null;
  smallGenreSubGroups: SmallGenreSubGroups;
  setGroup: (group: Group) => void;
  setCurrentMember: (member: GroupMember) => void;
  setSmallGenreSubGroups: (data: SmallGenreSubGroups) => void;
  reset: () => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  group: null,
  currentMember: null,
  smallGenreSubGroups: DEFAULT_SUBGROUPS,
  setGroup: (group) => set({ group }),
  setCurrentMember: (member) => set({ currentMember: member }),
  setSmallGenreSubGroups: (data) => set({ smallGenreSubGroups: data }),
  reset: () => set({ group: null, currentMember: null, smallGenreSubGroups: DEFAULT_SUBGROUPS }),
}));
