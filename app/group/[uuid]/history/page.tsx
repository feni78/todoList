"use client";

import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WishList } from "@/components/list/WishList";
import { useWishes } from "@/hooks/useWishes";
import { toast } from "sonner";

export default function HistoryPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { wishes, loading, updateWish, deleteWish, changeStatus } = useWishes(uuid);

  const doneWishes = wishes.filter((w) => w.status === "DONE");

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

      <div className="flex-1 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <WishList
            wishes={doneWishes}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            emptyMessage="実施済みのアイテムはありません"
          />
        )}
      </div>

      <BottomNav groupId={uuid} />
    </div>
  );
}
