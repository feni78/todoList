"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { HistoryList } from "@/components/history/HistoryList";
import { HistoryForm } from "@/components/history/HistoryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { WishHistory } from "@/types";
import { getGroupMember } from "@/lib/utils/localStorage";
import { toast } from "sonner";
import { useWishes } from "@/hooks/useWishes";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { wishes } = useWishes(uuid);
  const [histories, setHistories] = useState<WishHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const doneWishes = wishes.filter((w) => w.status === "DONE");

  const fetchHistories = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wish_histories")
      .select(`*, wish:wishes(id, title), member:group_members(id, nickname)`)
      .eq("wishes.group_id", uuid)
      .order("done_at", { ascending: false });

    if (!error && data) {
      setHistories(
        data.map((h) => ({
          id: h.id as string,
          wishId: h.wish_id as string,
          memberId: h.member_id as string,
          doneAt: h.done_at as string,
          comment: h.comment as string | undefined,
          wish: h.wish as { id: string; title: string },
          member: h.member as { id: string; nickname: string },
        }))
      );
    }
    setLoading(false);
  }, [uuid]);

  useEffect(() => {
    fetchHistories();
  }, [fetchHistories]);

  const handleUpdate = async (id: string, data: { doneAt: string; comment?: string }) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("wish_histories")
      .update({ done_at: data.doneAt, comment: data.comment ?? null })
      .eq("id", id);

    if (error) {
      toast.error("更新に失敗しました");
    } else {
      toast.success("更新しました");
      await fetchHistories();
    }
  };

  const handleAdd = async (data: { doneAt: string; comment?: string }) => {
    setAdding(true);
    const entry = getGroupMember(uuid);
    if (!entry) {
      toast.error("メンバー情報が見つかりません");
      setAdding(false);
      return;
    }

    if (doneWishes.length === 0) {
      toast.error("実施済みのアイテムがありません");
      setAdding(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("wish_histories").insert({
      wish_id: doneWishes[0].id,
      member_id: entry.memberId,
      done_at: data.doneAt,
      comment: data.comment ?? null,
    });

    if (error) {
      toast.error("追加に失敗しました");
    } else {
      toast.success("記録しました！");
      setAddOpen(false);
      await fetchHistories();
    }
    setAdding(false);
  };

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar title="実施履歴" />

      <div className="flex-1 py-4 flex flex-col gap-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {doneWishes.length > 0 && (
              <div className="px-4 flex flex-col gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">実施済み ({doneWishes.length})</p>
                <div className="flex flex-col gap-2">
                  {doneWishes.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                      <span className="text-sm flex-1">{w.title}</span>
                      <span className="text-xs text-muted-foreground">{w.member?.nickname}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {histories.length > 0 && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">実施記録</p>
              )}
              <HistoryList histories={histories} onUpdate={handleUpdate} />
            </div>
          </>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>実施記録を追加</DialogTitle>
          </DialogHeader>
          <HistoryForm
            onSubmit={handleAdd}
            onCancel={() => setAddOpen(false)}
            loading={adding}
          />
        </DialogContent>
      </Dialog>

      <BottomNav groupId={uuid} />
    </div>
  );
}
