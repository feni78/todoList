"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Genre } from "@/types";

export function useGenres(groupId: string) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGenres = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("genres")
      .select("id, group_id, name")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    setGenres(
      (data ?? []).map((r) => ({ id: r.id as string, groupId: r.group_id as string, name: r.name as string }))
    );
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetchGenres(); }, [fetchGenres]);

  const createGenre = useCallback(async (name: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("genres").insert({ group_id: groupId, name });
    if (error) { console.error("createGenre error:", error.message, error.code, error.details, error.hint); throw error; }
    await fetchGenres();
  }, [groupId, fetchGenres]);

  const updateGenre = useCallback(async (id: string, name: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("genres").update({ name }).eq("id", id);
    if (error) throw error;
    await fetchGenres();
  }, [fetchGenres]);

  const deleteGenre = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("genres").delete().eq("id", id);
    if (error) throw error;
    await fetchGenres();
  }, [fetchGenres]);

  return { genres, loading, createGenre, updateGenre, deleteGenre };
}
