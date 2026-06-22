"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wish, Status } from "@/types";
import { getGroupMember } from "@/lib/utils/localStorage";

function mapRow(row: Record<string, unknown>): Wish {
  const seasons = Array.isArray(row.wish_seasons)
    ? (row.wish_seasons as { season: string }[]).map((s) => s.season as Wish["seasons"][number])
    : [];
  const member = row.member as { id: string; nickname: string } | null;
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    memberId: row.member_id as string,
    title: row.title as string,
    priority: row.priority as Wish["priority"],
    situation: row.situation as Wish["situation"],
    status: row.status as Wish["status"],
    memo: row.memo as string | undefined,
    budget: row.budget as Wish["budget"] | undefined,
    duration: row.duration as Wish["duration"] | undefined,
    seasons,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    member: member ?? { id: row.member_id as string, nickname: "不明" },
  };
}

export function useWishes(groupId: string) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishes = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("wishes")
      .select(`*, wish_seasons(season), member:group_members!member_id(id, nickname)`)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setWishes((data ?? []).map((row) => mapRow(row as Record<string, unknown>)));
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishes", filter: `group_id=eq.${groupId}` },
        () => fetchWishes()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wish_seasons" },
        () => fetchWishes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchWishes]);

  const createWish = useCallback(
    async (data: {
      title: string;
      priority: Wish["priority"];
      situation: Wish["situation"];
      status: Wish["status"];
      memo?: string;
      budget?: Wish["budget"];
      duration?: Wish["duration"];
      seasons: Wish["seasons"];
    }) => {
      const entry = getGroupMember(groupId);
      if (!entry) throw new Error("メンバー情報が見つかりません");

      const supabase = createClient();
      const { data: wish, error } = await supabase
        .from("wishes")
        .insert({
          group_id: groupId,
          member_id: entry.memberId,
          title: data.title,
          priority: data.priority,
          situation: data.situation,
          status: data.status,
          memo: data.memo ?? null,
          budget: data.budget ?? null,
          duration: data.duration ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data.seasons.length > 0) {
        await supabase.from("wish_seasons").insert(
          data.seasons.map((season) => ({ wish_id: wish.id, season }))
        );
      }

      await fetchWishes();
      return wish;
    },
    [groupId, fetchWishes]
  );

  const updateWish = useCallback(
    async (
      wishId: string,
      data: {
        title?: string;
        priority?: Wish["priority"];
        situation?: Wish["situation"];
        status?: Wish["status"];
        memo?: string;
        budget?: Wish["budget"];
        duration?: Wish["duration"];
        seasons?: Wish["seasons"];
      }
    ) => {
      const supabase = createClient();
      const { seasons, ...rest } = data;

      const updatePayload: Record<string, unknown> = {};
      if (rest.title !== undefined) updatePayload.title = rest.title;
      if (rest.priority !== undefined) updatePayload.priority = rest.priority;
      if (rest.situation !== undefined) updatePayload.situation = rest.situation;
      if (rest.status !== undefined) updatePayload.status = rest.status;
      if (rest.memo !== undefined) updatePayload.memo = rest.memo;
      if (rest.budget !== undefined) updatePayload.budget = rest.budget;
      if (rest.duration !== undefined) updatePayload.duration = rest.duration;

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase.from("wishes").update(updatePayload).eq("id", wishId);
        if (error) throw error;
      }

      if (seasons !== undefined) {
        await supabase.from("wish_seasons").delete().eq("wish_id", wishId);
        if (seasons.length > 0) {
          await supabase.from("wish_seasons").insert(
            seasons.map((season) => ({ wish_id: wishId, season }))
          );
        }
      }

      await fetchWishes();
    },
    [fetchWishes]
  );

  const deleteWish = useCallback(
    async (wishId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("wishes").delete().eq("id", wishId);
      if (error) throw error;
      await fetchWishes();
    },
    [fetchWishes]
  );

  const changeStatus = useCallback(
    async (wishId: string, status: Status) => {
      await updateWish(wishId, { status });
    },
    [updateWish]
  );

  return { wishes, loading, error, createWish, updateWish, deleteWish, changeStatus, refetch: fetchWishes };
}
