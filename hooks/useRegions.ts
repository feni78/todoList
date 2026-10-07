"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Region } from "@/types";
import { toBroadRegionTag } from "@/lib/utils/regionTag";
import { toast } from "sonner";

export interface PrefixRule {
  id: string;
  broadRegionId: string;
  prefecture: string;
}

export function useRegions(groupId: string) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [prefixRules, setPrefixRules] = useState<PrefixRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegions = useCallback(async () => {
    const supabase = createClient();
    const [{ data: regData }, { data: rulesData }] = await Promise.all([
      supabase
        .from("regions")
        .select("id, group_id, name, sort_order, is_broad")
        .eq("group_id", groupId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("region_prefix_rules")
        .select("id, broad_region_id, prefecture")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true }),
    ]);

    setRegions(
      (regData ?? []).map((r) => ({
        id: r.id as string,
        groupId: r.group_id as string,
        name: r.name as string,
        isBroad: (r.is_broad as boolean) ?? false,
      }))
    );
    setPrefixRules(
      (rulesData ?? []).map((r) => ({
        id: r.id as string,
        broadRegionId: r.broad_region_id as string,
        prefecture: r.prefecture as string,
      }))
    );
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const createRegion = useCallback(async (name: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("regions").insert({ group_id: groupId, name, is_broad: false });
    if (error) throw error;
    await fetchRegions();
  }, [groupId, fetchRegions]);

  const createBroadRegion = useCallback(async (name: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("regions").insert({ group_id: groupId, name, is_broad: true });
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
    const results = await Promise.allSettled(
      orderedIds.map((id, idx) =>
        supabase.from("regions").update({ sort_order: idx }).eq("id", id)
      )
    );
    const failed = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && (r.value as { error?: unknown }).error != null)
    ).length;
    if (failed > 0) toast.error(`並び替えの保存に失敗しました（${failed}件）`);
    await fetchRegions();
  }, [fetchRegions]);

  const addPrefectureRule = useCallback(async (broadRegionId: string, prefecture: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("region_prefix_rules")
      .insert({ group_id: groupId, broad_region_id: broadRegionId, prefecture });
    if (error) throw error;
    await fetchRegions();
  }, [groupId, fetchRegions]);

  const removePrefectureRule = useCallback(async (ruleId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("region_prefix_rules")
      .delete()
      .eq("id", ruleId);
    if (error) throw error;
    await fetchRegions();
  }, [fetchRegions]);

  // 指定した中地域のルールに基づき、対象wishの中地域タグを一括置換する
  // 戻り値: 書き換えたwish件数
  const applyBroadRegionRules = useCallback(async (broadRegionId: string): Promise<number> => {
    const supabase = createClient();

    const rules = prefixRules.filter((r) => r.broadRegionId === broadRegionId);
    if (rules.length === 0) return 0;

    // ルールに一致する小地域タグを取得
    const specificRegionIds = regions
      .filter((r) => !r.isBroad && rules.some((rule) => r.name.startsWith(rule.prefecture)))
      .map((r) => r.id);
    if (specificRegionIds.length === 0) return 0;

    // 対象の小地域タグを持つwish IDを取得
    const { data: wishRegionData, error: wrError } = await supabase
      .from("wish_regions")
      .select("wish_id")
      .in("region_id", specificRegionIds);
    if (wrError) throw wrError;

    const affectedWishIds = [...new Set((wishRegionData ?? []).map((r) => (r as { wish_id: string }).wish_id))];
    if (affectedWishIds.length === 0) return 0;

    // このグループの中地域タグIDを全取得（置換元）
    const otherBroadIds = regions
      .filter((r) => r.isBroad && r.id !== broadRegionId)
      .map((r) => r.id);

    const CHUNK = 50;

    // 他の中地域タグを削除
    if (otherBroadIds.length > 0) {
      for (let i = 0; i < affectedWishIds.length; i += CHUNK) {
        const chunk = affectedWishIds.slice(i, i + CHUNK);
        const { error } = await supabase
          .from("wish_regions")
          .delete()
          .in("wish_id", chunk)
          .in("region_id", otherBroadIds);
        if (error) throw error;
      }
    }

    // 新しい中地域タグを付与
    for (let i = 0; i < affectedWishIds.length; i += CHUNK) {
      const chunk = affectedWishIds.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("wish_regions")
        .upsert(
          chunk.map((wish_id) => ({ wish_id, region_id: broadRegionId })),
          { onConflict: "wish_id,region_id", ignoreDuplicates: true }
        );
      if (error) throw error;
    }

    return affectedWishIds.length;
  }, [groupId, regions, prefixRules]);

  return {
    regions,
    prefixRules,
    loading,
    createRegion,
    createBroadRegion,
    updateRegion,
    deleteRegion,
    reorderRegions,
    addPrefectureRule,
    removePrefectureRule,
    applyBroadRegionRules,
  };
}

// CSVインポート時にグループのカスタムルールを取得する（hookの外で使える版）
export async function fetchPrefixRulesForGroup(
  supabase: ReturnType<typeof createClient>,
  groupId: string
): Promise<{ prefecture: string; broadName: string }[]> {
  const { data } = await supabase
    .from("region_prefix_rules")
    .select("prefecture, regions!inner(name)")
    .eq("group_id", groupId);
  return (data ?? []).map((r) => {
    const row = r as unknown as { prefecture: string; regions: { name: string } | { name: string }[] };
    const regionName = Array.isArray(row.regions) ? row.regions[0]?.name : row.regions.name;
    return { prefecture: row.prefecture, broadName: regionName ?? "" };
  }).filter((r) => r.broadName !== "");
}

// プレフィックスルールを考慮して中地域タグ名を解決する
export function resolveBroadTag(
  prefecture: string,
  city: string,
  rules: { prefecture: string; broadName: string }[]
): string {
  const custom = rules.find((r) => r.prefecture === prefecture);
  if (custom) return custom.broadName;
  return toBroadRegionTag(prefecture, city);
}
