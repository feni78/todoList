"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Region } from "@/types";

export function useRegions(groupId: string) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("regions")
      .select("id, group_id, name, sort_order")
      .eq("group_id", groupId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    setRegions(
      (data ?? []).map((r) => ({ id: r.id as string, groupId: r.group_id as string, name: r.name as string }))
    );
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const createRegion = useCallback(async (name: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("regions").insert({ group_id: groupId, name });
    if (error) throw error;
    await fetchRegions();
  }, [groupId, fetchRegions]);

  const updateRegion = useCallback(async (id: string, name: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("regions").update({ name }).eq("id", id);
    if (error) throw error;
    await fetchRegions();
  }, [fetchRegions]);

  const deleteRegion = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("regions").delete().eq("id", id);
    if (error) throw error;
    await fetchRegions();
  }, [fetchRegions]);

  const reorderRegions = useCallback(async (orderedIds: string[]) => {
    const supabase = createClient();
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from("regions").update({ sort_order: idx }).eq("id", id)
      )
    );
    await fetchRegions();
  }, [fetchRegions]);

  return { regions, loading, createRegion, updateRegion, deleteRegion, reorderRegions };
}
