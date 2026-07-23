"use client";

import { useState, useRef, useEffect } from "react";
import { searchStations, Station } from "@/lib/utils/station";
import { X, MapPin } from "lucide-react";

interface StationSearchProps {
  value: string | null;
  onChange: (name: string | null) => void;
}

export function StationSearch({ value, onChange }: StationSearchProps) {
  const [query, setQuery] = useState(value ?? "");
  const [candidates, setCandidates] = useState<Station[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === null) setQuery("");
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInput = (q: string) => {
    setQuery(q);
    onChange(null);
    if (q.trim()) {
      setCandidates(searchStations(q));
      setOpen(true);
    } else {
      setCandidates([]);
      setOpen(false);
    }
  };

  const handleSelect = (station: Station) => {
    setQuery(station.name);
    onChange(station.name);
    setOpen(false);
    setCandidates([]);
  };

  const handleClear = () => {
    setQuery("");
    onChange(null);
    setCandidates([]);
    setOpen(false);
  };

  const isSelected = value !== null && value === query;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-2 bg-background transition-colors ${isSelected ? "border-primary" : "border-border"}`}>
        <MapPin size={14} className={isSelected ? "text-primary" : "text-muted-foreground"} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="駅名を入力（例：新宿）"
          className="flex-1 text-sm bg-transparent outline-none"
        />
        {query && (
          <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
      {isSelected && (
        <p className="text-xs text-primary mt-1 px-1">✓ {value}を基準に検索</p>
      )}
      {open && candidates.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {candidates.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {open && candidates.length === 0 && query.trim() && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg px-3 py-2.5 text-sm text-muted-foreground">
          該当する駅が見つかりません
        </div>
      )}
    </div>
  );
}
