const STORAGE_KEY = "futari_yaritai";

interface StorageGroupEntry {
  groupId: string;
  groupName: string;
  memberId: string;
  nickname: string;
  lastVisitedAt: string;
}

interface StorageData {
  currentMemberId: string;
  currentGroupId: string;
  groups: StorageGroupEntry[];
  darkMode: boolean;
}

function getStorage(): StorageData {
  if (typeof window === "undefined") {
    return { currentMemberId: "", currentGroupId: "", groups: [], darkMode: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { currentMemberId: "", currentGroupId: "", groups: [], darkMode: false };
    return JSON.parse(raw) as StorageData;
  } catch {
    return { currentMemberId: "", currentGroupId: "", groups: [], darkMode: false };
  }
}

function setStorage(data: StorageData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getGroupMember(groupId: string): StorageGroupEntry | null {
  const data = getStorage();
  return data.groups.find((g) => g.groupId === groupId) ?? null;
}

export function saveGroupMember(entry: StorageGroupEntry): void {
  const data = getStorage();
  const idx = data.groups.findIndex((g) => g.groupId === entry.groupId);
  if (idx >= 0) {
    data.groups[idx] = entry;
  } else {
    data.groups.push(entry);
  }
  data.currentGroupId = entry.groupId;
  data.currentMemberId = entry.memberId;
  setStorage(data);
}

export function updateLastVisited(groupId: string): void {
  const data = getStorage();
  const idx = data.groups.findIndex((g) => g.groupId === groupId);
  if (idx >= 0) {
    data.groups[idx].lastVisitedAt = new Date().toISOString();
    data.currentGroupId = groupId;
    data.currentMemberId = data.groups[idx].memberId;
    setStorage(data);
  }
}

export function getDarkMode(): boolean {
  return getStorage().darkMode;
}

export function setDarkMode(value: boolean): void {
  const data = getStorage();
  data.darkMode = value;
  setStorage(data);
}

export function getAllGroups(): StorageGroupEntry[] {
  return getStorage().groups;
}

export function getDefaultExcludeGenreIds(groupId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`futari_default_exclude_${groupId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveDefaultExcludeGenreIds(groupId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`futari_default_exclude_${groupId}`, JSON.stringify(ids));
}
