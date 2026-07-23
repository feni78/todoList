import stationsData from "@/lib/data/stations.json";

export interface Station {
  name: string;
  lat: number;
  lng: number;
}

const stations: Station[] = stationsData as Station[];

export function searchStations(query: string): Station[] {
  const q = query.replace(/駅$/, "").trim();
  if (!q) return [];
  const lower = q;
  const prefix: Station[] = [];
  const contains: Station[] = [];
  for (const s of stations) {
    if (s.name === lower) { prefix.unshift(s); continue; }
    if (s.name.startsWith(lower)) { prefix.push(s); continue; }
    if (s.name.includes(lower)) { contains.push(s); }
  }
  return [...prefix, ...contains].slice(0, 20);
}

export function findStation(name: string): Station | null {
  return stations.find((s) => s.name === name) ?? null;
}
