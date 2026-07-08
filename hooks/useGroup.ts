"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Group, GroupMember } from "@/types";
import { saveGroupMember } from "@/lib/utils/localStorage";

export function useGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = useCallback(async (groupName: string, nickname: string) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({ name: groupName })
        .select()
        .single();

      if (groupError) throw groupError;

      const { data: member, error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, nickname })
        .select()
        .single();

      if (memberError) throw memberError;

      saveGroupMember({
        groupId: group.id,
        groupName: group.name,
        memberId: member.id,
        nickname: member.nickname,
        lastVisitedAt: new Date().toISOString(),
      });

      return { group: group as Group, member: member as GroupMember };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinGroup = useCallback(async (groupId: string, nickname: string) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*, members:group_members(*)")
        .eq("id", groupId)
        .single();

      if (groupError) throw new Error("グループが見つかりません");

      const { data: member, error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, nickname })
        .select()
        .single();

      if (memberError) throw memberError;

      saveGroupMember({
        groupId,
        groupName: (group as { name: string }).name,
        memberId: member.id,
        nickname: member.nickname,
        lastVisitedAt: new Date().toISOString(),
      });

      return { group: group as Group, member: member as GroupMember };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroup = useCallback(async (groupId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("groups")
      .select("*, members:group_members(*)")
      .eq("id", groupId)
      .single();

    if (error) throw error;
    return data as Group & { members: GroupMember[] };
  }, []);

  const fetchRouletteSettings = useCallback(async (groupId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("roulette_settings")
      .select("*")
      .eq("group_id", groupId)
      .single();

    return data;
  }, []);

  const saveRouletteSettings = useCallback(
    async (
      groupId: string,
      settings: {
        considerLevel: number;
        weightMax: number;
        weightGold: number;
        weightSilver: number;
        weightBronze: number;
      }
    ) => {
      const supabase = createClient();
      await supabase.from("roulette_settings").upsert({
        group_id: groupId,
        consider_level: settings.considerLevel,
        weight_max: settings.weightMax,
        weight_gold: settings.weightGold,
        weight_silver: settings.weightSilver,
        weight_bronze: settings.weightBronze,
      }, { onConflict: "group_id" });
    },
    []
  );

  return { loading, error, createGroup, joinGroup, fetchGroup, fetchRouletteSettings, saveRouletteSettings };
}
