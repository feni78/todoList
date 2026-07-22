"use client";

import { useRef, useLayoutEffect, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Wish, Genre } from "@/types";
import { WishItem } from "./WishItem";

interface WishListProps {
  wishes: Wish[];
  genres?: Genre[];
  onUpdate: Parameters<typeof WishItem>[0]["onUpdate"];
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: Wish["status"]) => Promise<void>;
  emptyMessage?: string;
}

export function WishList({ wishes, genres = [], onUpdate, onDelete, onStatusChange, emptyMessage }: WishListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop);
    }
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
              key={wish.id}
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
                onUpdate={onUpdate}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
