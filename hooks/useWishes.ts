"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Wish, WishVote, Genre, Region, ScoreValue, Status } from "@/types";
import { getGroupMember } from "@/lib/utils/localStorage";

type SupabaseClient = ReturnType<typeof createClient>;

async function saveVote(supabase: SupabaseClient, wishId: string, memberId: string, score: ScoreValue) {
  const { data: existing, error: selErr } = await supabase
    .from("wish_votes")
    .select("id")
    .eq("wish_id", wishId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (selErr) throw new Error(`wish_votes select: ${selErr.message}`);

  if (existing) {
    const { error } = await supabase.from("wish_votes").update({ score }).eq("id", existing.id);
    if (error) throw new Error(`wish_votes update: ${error.message}`);
  } else {
    const { error } = await supabase.from("wish_votes").insert({ wish_id: wishId, member_id: memberId, score });
    if (error) throw new Error(`wish_votes insert: ${error.message}`);
  }
}

function mapRow(row: Record<string, unknown>): Wish {
  const seasons = Array.isArray(row.wish_seasons)
    ? (row.wish_seasons as { season: string }[]).map((s) => s.season as Wish["seasons"][number])
    : [];
  const genres: Genre[] = Array.isArray(row.wish_genres)
    ? (row.wish_genres as { genre: { id: string; group_id: string; name: string } }[])
        .filter((g) => g.genre)
        .map((g) => ({ id: g.genre.id, groupId: g.genre.group_id, name: g.genre.name }))
    : [];
  const regions: Region[] = Array.isArray(row.wish_regions)
    ? (row.wish_regions as { region: { id: string; group_id: string; name: string } }[])
        .filter((r) => r.region)
        .map((r) => ({ id: r.region.id, groupId: r.region.group_id, name: r.region.name }))
    : [];
  const member = row.member as { id: string; nickname: string } | null;
  const rawVotes = Array.isArray(row.wish_votes)
    ? (row.wish_votes as { id: string; member_id: string; score: number }[])
    : [];
  const votes: WishVote[] = rawVotes.map((v) => ({
    id: v.id,
    wishId: row.id as string,
    memberId: v.member_id,
    score: v.score as ScoreValue,
  }));
  const avgScore = votes.length > 0
    ? votes.reduce((sum, v) => sum + v.score, 0) / votes.length
    : 0;
  const hasMaxVote = votes.some((v) => v.score === 100);

  return {
    id: row.id as string,
    groupId: row.group_id as string,
    memberId: row.member_id as string,
    title: row.title as string,
    situation: row.situation as Wish["situation"],
    status: row.status as Wish["status"],
    memo: row.memo as string | undefined,
    budget: row.budget as Wish["budget"] | undefined,
    duration: row.duration as Wish["duration"] | undefined,
    seasons,
    genres,
    regions,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    doneAt: (row.done_at as string | null) ?? null,
    member: member ?? { id: row.member_id as string, nickname: "不明" },
    votes,
    avgScore,
    hasMaxVote,
    isFavorite: (row.is_favorite as boolean) ?? false,
    placeId: (row.place_id as string | null) ?? null,
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
  };
}

export function useWishes(groupId: string, options?: { statuses?: Status[] }) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // statuses はページごとに固定なので ref で安定参照する
  const statusesRef = useRef<Status[]>(options?.statuses ?? ["PENDING", "HOLD"]);
  const fetchIdRef = useRef(0);

  const fetchWishes = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    const supabase = createClient();
    const statuses = statusesRef.current;

    const PAGE = 1000;
    let allData: Record<string, unknown>[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("wishes")
        .select(`*, wish_seasons(season), wish_genres(genre:genres(id, group_id, name)), wish_regions(region:regions(id, group_id, name)), member:group_members!member_id(id, nickname), wish_votes(id, member_id, score), place_id, latitude, longitude`)
        .eq("group_id", groupId)
        .is("deleted_at", null)
        .in("status", statuses)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        if (fetchId !== fetchIdRef.current) return;
        setError(error.message);
        setLoading(false);
        return;
      }
      allData = allData.concat(data ?? []);
      if ((data ?? []).length < PAGE) break;
      from += PAGE;
    }

    if (fetchId !== fetchIdRef.current) return;
    setWishes(allData.map((row) => mapRow(row as Record<string, unknown>)));
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`group:${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wishes", filter: `group_id=eq.${groupId}` }, () => fetchWishes())
      .on("postgres_changes", { event: "*", schema: "public", table: "wish_seasons" }, () => fetchWishes())
      .on("postgres_changes", { event: "*", schema: "public", table: "wish_votes" }, () => fetchWishes())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, fetchWishes]);

  const createWish = useCallback(
    async (data: {
      title: string;
      situation: Wish["situation"];
      status: Wish["status"];
      memo?: string;
      budget?: Wish["budget"];
      duration?: Wish["duration"];
      seasons: Wish["seasons"];
      genreIds?: string[];
      regionIds?: string[];
      myScore?: ScoreValue | null;
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

      if (data.genreIds && data.genreIds.length > 0) {
        await supabase.from("wish_genres").insert(
          data.genreIds.map((genre_id) => ({ wish_id: wish.id, genre_id }))
        );
      }

      if (data.regionIds && data.regionIds.length > 0) {
        await supabase.from("wish_regions").insert(
          data.regionIds.map((region_id) => ({ wish_id: wish.id, region_id }))
        );
      }

      if (data.myScore != null) {
        await saveVote(supabase, wish.id, entry.memberId, data.myScore);
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
        memberId?: string;
        situation?: Wish["situation"];
        status?: Wish["status"];
        doneAt?: string | null;
        memo?: string;
        budget?: Wish["budget"];
        duration?: Wish["duration"];
        seasons?: Wish["seasons"];
        genreIds?: string[];
        regionIds?: string[];
        myScore?: ScoreValue | null;
      }
    ) => {
      const entry = getGroupMember(groupId);
      const supabase = createClient();
      const { seasons, genreIds, regionIds, myScore, ...rest } = data;

      const updatePayload: Record<string, unknown> = {};
      if (rest.memberId !== undefined) updatePayload.member_id = rest.memberId;
      if (rest.title !== undefined) updatePayload.title = rest.title;
      if (rest.situation !== undefined) updatePayload.situation = rest.situation;
      if (rest.status !== undefined) updatePayload.status = rest.status;
      if (rest.doneAt !== undefined) updatePayload.done_at = rest.doneAt;
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

      if (genreIds !== undefined) {
        await supabase.from("wish_genres").delete().eq("wish_id", wishId);
        if (genreIds.length > 0) {
          await supabase.from("wish_genres").insert(
            genreIds.map((genre_id) => ({ wish_id: wishId, genre_id }))
          );
        }
      }

      if (regionIds !== undefined) {
        await supabase.from("wish_regions").delete().eq("wish_id", wishId);
        if (regionIds.length > 0) {
          await supabase.from("wish_regions").insert(
            regionIds.map((region_id) => ({ wish_id: wishId, region_id }))
          );
        }
      }

      if (myScore !== undefined && entry) {
        if (myScore === null) {
          await supabase.from("wish_votes").delete().eq("wish_id", wishId).eq("member_id", entry.memberId);
        } else {
          await saveVote(supabase, wishId, entry.memberId, myScore);
        }
      }

      await fetchWishes();
    },
    [groupId, fetchWishes]
  );

  const deleteWish = useCallback(
    async (wishId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("wishes").update({ deleted_at: new Date().toISOString() }).eq("id", wishId);
      if (error) throw error;
      await fetchWishes();
    },
    [fetchWishes]
  );

  const changeStatus = useCallback(
    async (wishId: string, status: Status) => {
      const doneAt = status === "DONE" ? new Date().toISOString() : null;
      await updateWish(wishId, { status, doneAt });
    },
    [updateWish]
  );

  const bulkUpdateGenres = useCallback(
    async (wishIds: string[], genreIds: string[], mode: "add" | "remove") => {
      const supabase = createClient();
      if (mode === "add") {
        const links = wishIds.flatMap((wid) => genreIds.map((gid) => ({ wish_id: wid, genre_id: gid })));
        const CHUNK = 500;
        for (let i = 0; i < links.length; i += CHUNK) {
          const { error } = await supabase.from("wish_genres")
            .upsert(links.slice(i, i + CHUNK), { onConflict: "wish_id,genre_id", ignoreDuplicates: true });
          if (error) throw error;
        }
      } else {
        for (const genreId of genreIds) {
          const CHUNK = 200;
          for (let i = 0; i < wishIds.length; i += CHUNK) {
            const { error } = await supabase.from("wish_genres")
              .delete()
              .in("wish_id", wishIds.slice(i, i + CHUNK))
              .eq("genre_id", genreId);
            if (error) throw error;
          }
        }
      }
      await fetchWishes();
    },
    [fetchWishes]
  );

  const bulkDeleteWishes = useCallback(
    async (wishIds: string[]) => {
      const supabase = createClient();
      const CHUNK = 200;
      for (let i = 0; i < wishIds.length; i += CHUNK) {
        const { error } = await supabase.from("wishes")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", wishIds.slice(i, i + CHUNK));
        if (error) throw error;
      }
      await fetchWishes();
    },
    [fetchWishes]
  );

  const toggleFavorite = useCallback(
    async (wishId: string, value: boolean) => {
      // ローカル状態を即時更新（楽観的更新）
      setWishes((prev) => prev.map((w) => w.id === wishId ? { ...w, isFavorite: value } : w));
      const supabase = createClient();
      const { error } = await supabase.from("wishes").update({ is_favorite: value }).eq("id", wishId);
      if (error) {
        // 失敗時はロールバック
        setWishes((prev) => prev.map((w) => w.id === wishId ? { ...w, isFavorite: !value } : w));
        throw error;
      }
    },
    []
  );

  return { wishes, loading, error, createWish, updateWish, deleteWish, bulkDeleteWishes, changeStatus, toggleFavorite, bulkUpdateGenres, refetch: fetchWishes };
}
