"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TrashItem {
  id: string;
  title: string;
  deletedAt: string;
}

export function useTrash(groupId: string) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("wishes")
      .select("id, title, deleted_at")
      .eq("group_id", groupId)
      .not("deleted_at", "is", null)
      .gte("deleted_at", threshold)
      .order("deleted_at", { ascending: false });

    setItems(
      (data ?? []).map((r) => ({ id: r.id as string, title: r.title as string, deletedAt: r.deleted_at as string }))
    );
    setLoading(false);
  }, [groupId]);

  const restoreWish = useCallback(async (wishId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("wishes").update({ deleted_at: null }).eq("id", wishId);
    if (error) throw error;
    await fetchTrash();
  }, [fetchTrash]);

  const permanentDelete = useCallback(async (wishId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("wishes").delete().eq("id", wishId);
    if (error) throw error;
    await fetchTrash();
  }, [fetchTrash]);

  const emptyTrash = useCallback(async () => {
    const supabase = createClient();
    const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("wishes")
      .delete()
      .eq("group_id", groupId)
      .not("deleted_at", "is", null)
      .gte("deleted_at", threshold);
    if (error) throw error;
    setItems([]);
  }, [groupId]);

  return { items, loading, fetchTrash, restoreWish, permanentDelete, emptyTrash };
}
