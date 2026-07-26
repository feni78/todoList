"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Genre, GenreType, GENRE_TYPE_ORDER } from "@/types";

export function useGenres(groupId: string) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGenres = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("genres")
      .select("id, group_id, name, sort_order, genre_type")
      .eq("group_id", groupId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    const mapped = (data ?? []).map((r) => ({
      id: r.id as string,
      groupId: r.group_id as string,
      name: r.name as string,
      genreType: ((r.genre_type as string) ?? 'MEDIUM') as GenreType,
    }));
    // Sort: LARGE → MEDIUM → SMALL, then by sort_order (already ordered by DB)
    mapped.sort((a, b) => GENRE_TYPE_ORDER[a.genreType] - GENRE_TYPE_ORDER[b.genreType]);
    setGenres(mapped);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetchGenres(); }, [fetchGenres]);

  const createGenre = useCallback(async (name: string, genreType: GenreType = 'MEDIUM') => {
    const supabase = createClient();
    const { error } = await supabase.from("genres").insert({ group_id: groupId, name, genre_type: genreType });
    if (error) { console.error("createGenre error:", error.message, error.code, error.details, error.hint); throw error; }
    await fetchGenres();
  }, [groupId, fetchGenres]);

  const updateGenre = useCallback(async (id: string, updates: { name?: string; genreType?: GenreType }) => {
    const supabase = createClient();
    const payload: Record<string, string> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.genreType !== undefined) payload.genre_type = updates.genreType;
    const { error } = await supabase.from("genres").update(payload).eq("id", id);
    if (error) throw error;
    await fetchGenres();
  }, [fetchGenres]);

  const deleteGenre = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("genres").delete().eq("id", id);
    if (error) throw error;
    await fetchGenres();
  }, [fetchGenres]);

  const reorderGenres = useCallback(async (orderedIds: string[]) => {
    const supabase = createClient();
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from("genres").update({ sort_order: idx }).eq("id", id)
      )
    );
    await fetchGenres();
  }, [fetchGenres]);

  return { genres, loading, createGenre, updateGenre, deleteGenre, reorderGenres };
}
