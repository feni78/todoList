"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WishList } from "@/components/list/WishList";
import { useWishes } from "@/hooks/useWishes";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { wishes, loading, updateWish, deleteWish, changeStatus, toggleFavorite: toggleFavoriteWish } = useWishes(uuid, { statuses: ["DONE"] });

  const handleToggleFavorite = async (id: string, value: boolean) => {
    try {
      await toggleFavoriteWish(id, value);
    } catch {
      toast.error("お気に入りの更新に失敗しました。DBマイグレーションを確認してください。");
    }
  };
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [showFavoriteOnly]);

  const displayWishes = showFavoriteOnly ? wishes.filter((w) => w.isFavorite) : wishes;

  const handleUpdate = async (id: string, data: Parameters<typeof updateWish>[1]) => {
    try {
      await updateWish(id, data);
      toast.success("更新しました");
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWish(id);
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleStatusChange = async (id: string, status: Parameters<typeof changeStatus>[1]) => {
    try {
      await changeStatus(id, status);
    } catch {
      toast.error("ステータスの変更に失敗しました");
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar title="実施済み" />

      <div className="flex items-center justify-end px-4 pt-3 pb-1">
        <button
          onClick={() => setShowFavoriteOnly((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors",
            showFavoriteOnly
              ? "border-yellow-400 text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Star size={13} fill={showFavoriteOnly ? "currentColor" : "none"} />
          お気に入り
        </button>
      </div>

      <div className="flex-1 py-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <WishList
            wishes={displayWishes}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onToggleFavorite={handleToggleFavorite}
            emptyMessage={showFavoriteOnly ? "お気に入りのアイテムはありません" : "実施済みのアイテムはありません"}
          />
        )}
      </div>

      <BottomNav groupId={uuid} />
    </div>
  );
}
