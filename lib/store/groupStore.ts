import { create } from "zustand";
import { Group, GroupMember } from "@/types";

interface GroupState {
  group: Group | null;
  currentMember: GroupMember | null;
  setGroup: (group: Group) => void;
  setCurrentMember: (member: GroupMember) => void;
  reset: () => void;
}

export const useGroupStore = create<GroupState>((set) => ({
  group: null,
  currentMember: null,
  setGroup: (group) => set({ group }),
  setCurrentMember: (member) => set({ currentMember: member }),
  reset: () => set({ group: null, currentMember: null }),
}));
