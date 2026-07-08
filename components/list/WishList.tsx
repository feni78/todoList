"use client";

import { AnimatePresence } from "framer-motion";
import { Wish, Genre } from "@/types";
import { WishItem } from "./WishItem";

interface WishListProps {
  wishes: Wish[];
  genres?: Genre[];
  onUpdate: (id: string, data: Parameters<Parameters<typeof WishItem>[0]["onUpdate"]>[1]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: Wish["status"]) => Promise<void>;
  emptyMessage?: string;
}

export function WishList({ wishes, genres = [], onUpdate, onDelete, onStatusChange, emptyMessage }: WishListProps) {
  if (wishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <span className="text-4xl mb-3">🗒️</span>
        <p className="text-sm">{emptyMessage ?? "やりたいことを追加しよう！"}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl overflow-hidden bg-card border border-border mx-4">
      <AnimatePresence initial={false}>
        {wishes.map((wish) => (
          <WishItem
            key={wish.id}
            wish={wish}
            genres={genres}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
