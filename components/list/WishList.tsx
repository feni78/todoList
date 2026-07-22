"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Wish, Genre, Region } from "@/types";
import { WishItem } from "./WishItem";

interface WishListProps {
  wishes: Wish[];
  genres?: Genre[];
  regions?: Region[];
  onUpdate: Parameters<typeof WishItem>[0]["onUpdate"];
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: Wish["status"]) => Promise<void>;
  onToggleFavorite?: (id: string, value: boolean) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  emptyMessage?: string;
}

export function WishList({ wishes, genres = [], regions = [], onUpdate, onDelete, onStatusChange, onToggleFavorite, selectionMode, selectedIds, onToggleSelect, emptyMessage }: WishListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => setScrollMargin(el.offsetTop);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: wishes.length,
    estimateSize: () => 72,
    overscan: 8,
    scrollMargin,
  });

  if (wishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <span className="text-4xl mb-3">🗒️</span>
        <p className="text-sm">{emptyMessage ?? "やりたいことを追加しよう！"}</p>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={listRef} className="mx-4 rounded-xl overflow-hidden bg-card border border-border">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {items.map((virtualRow) => {
          const wish = wishes[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              }}
            >
              <WishItem
                wish={wish}
                genres={genres}
                regions={regions}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onToggleFavorite={onToggleFavorite}
                selectionMode={selectionMode}
                isSelected={selectedIds?.has(wish.id)}
                onToggleSelect={onToggleSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
