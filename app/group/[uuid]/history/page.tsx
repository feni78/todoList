"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WishList } from "@/components/list/WishList";
import { FilterPanel } from "@/components/list/FilterPanel";
import { BulkGenreBar } from "@/components/list/BulkGenreBar";
import { FilterSummary } from "@/components/list/FilterSummary";
import { Input } from "@/components/ui/input";
import { useWishes } from "@/hooks/useWishes";
import { useGenres } from "@/hooks/useGenres";
import { useRegions } from "@/hooks/useRegions";
import { useGroupStore } from "@/lib/store/groupStore";
import { useFilterStore } from "@/lib/store/filterStore";
import { isBroadRegionTag } from "@/lib/utils/regionTag";
import { meetsScoreFilter } from "@/types";
import { findStation } from "@/lib/utils/station";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Star, SlidersHorizontal, ArrowUpDown, Search, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";

export default function HistoryPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const group = useGroupStore((s) => s.group);
  const { wishes, loading, updateWish, deleteWish, changeStatus, toggleFavorite: toggleFavoriteWish, bulkUpdateGenres } = useWishes(uuid, { statuses: ["DONE"] });
  const { genres } = useGenres(uuid);
  const { regions } = useRegions(uuid);

  const {
    memberIds: fMemberIds,
    situations: fSituations,
    budgets: fBudgets,
    durations: fDurations,
    seasons: fSeasons,
    scoreFilter: fScoreFilter,
    genreIds: fGenreIds,
    genreSearchMode: fGenreSearchMode,
    excludeGenreIds: fExcludeGenreIds,
    regionIds: fRegionIds,
    excludeRegionIds: fExcludeRegionIds,
    nearbyKm: fNearbyKm,
    stationName: fStationName,
    defaultExcludeGenreIds: fDefaultExcludeGenreIds,
    defaultExcludeRegionIds: fDefaultExcludeRegionIds,
    historySearchQuery,
    setHistorySearchQuery,
  } = useFilterStore(useShallow((s) => ({
    memberIds: s.memberIds,
    situations: s.situations,
    budgets: s.budgets,
    durations: s.durations,
    seasons: s.seasons,
    scoreFilter: s.scoreFilter,
    genreIds: s.genreIds,
    genreSearchMode: s.genreSearchMode,
    excludeGenreIds: s.excludeGenreIds,
    regionIds: s.regionIds,
    excludeRegionIds: s.excludeRegionIds,
    nearbyKm: s.nearbyKm,
    stationName: s.stationName,
    defaultExcludeGenreIds: s.defaultExcludeGenreIds,
    defaultExcludeRegionIds: s.defaultExcludeRegionIds,
    historySearchQuery: s.historySearchQuery,
    setHistorySearchQuery: s.setHistorySearchQuery,
  })));

  type SortOrder = "priority" | "createdAt" | "doneAt";
  const SORT_LABELS: Record<SortOrder, string> = { priority: "やりたい度順", createdAt: "登録日順", doneAt: "実施日順" };
  const SORT_CYCLE: SortOrder[] = ["priority", "createdAt", "doneAt"];

  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("doneAt");
  const [nearbyWishIds, setNearbyWishIds] = useState<Set<string> | null>(null);
  const nearbyKmRef = useRef<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"genre" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const km = fNearbyKm;
    const stationName = fStationName;
    nearbyKmRef.current = km;
    if (km === null) { setNearbyWishIds(null); return; }

    if (stationName !== null) {
      const station = findStation(stationName);
      if (!station) { setNearbyWishIds(null); return; }
      (async () => {
        if (nearbyKmRef.current !== km) return;
        try {
          const supabase = createClient();
          const { data, error } = await supabase.rpc("get_wishes_by_distance", {
            p_group_id: uuid, p_lat: station.lat, p_lng: station.lng, p_max_km: km, p_limit: 500,
          });
          if (nearbyKmRef.current !== km) return;
          if (error) throw error;
          setNearbyWishIds(new Set((data as { id: string }[]).map((r) => r.id)));
        } catch {
          if (nearbyKmRef.current !== km) return;
          toast.error("距離フィルターの取得に失敗しました");
          setNearbyWishIds(null);
        }
      })();
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      if (nearbyKmRef.current !== km) return;
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_wishes_by_distance", {
          p_group_id: uuid, p_lat: pos.coords.latitude, p_lng: pos.coords.longitude, p_max_km: km, p_limit: 500,
        });
        if (nearbyKmRef.current !== km) return;
        if (error) throw error;
        setNearbyWishIds(new Set((data as { id: string }[]).map((r) => r.id)));
      } catch {
        if (nearbyKmRef.current !== km) return;
        toast.error("現在地の取得に失敗しました");
        setNearbyWishIds(null);
      }
    }, () => {
      toast.error("位置情報の取得を許可してください");
      setNearbyWishIds(null);
    });
  }, [fNearbyKm, fStationName, uuid]);

  const excludeChanged =
    fExcludeGenreIds.some((id) => !fDefaultExcludeGenreIds.includes(id)) ||
    fDefaultExcludeGenreIds.some((id) => !fExcludeGenreIds.includes(id)) ||
    fExcludeRegionIds.some((id) => !fDefaultExcludeRegionIds.includes(id)) ||
    fDefaultExcludeRegionIds.some((id) => !fExcludeRegionIds.includes(id));

  const hasFilter =
    fMemberIds.length > 0 ||
    fSituations.length > 0 ||
    fBudgets.length > 0 ||
    fDurations.length > 0 ||
    fSeasons.length > 0 ||
    fGenreIds.length > 0 ||
    fRegionIds.length > 0 ||
    fNearbyKm !== null ||
    fScoreFilter !== null ||
    excludeChanged;

  const filtered = useMemo(() => {
    let result = [...wishes];
    if (showFavoriteOnly) result = result.filter((w) => w.isFavorite);
    if (fMemberIds.length > 0) result = result.filter((w) => fMemberIds.includes(w.memberId));
    if (fSituations.length > 0) {
      result = result.filter((w) => fSituations.includes(w.situation) || w.situation === "EITHER");
    }
    if (fBudgets.length > 0) result = result.filter((w) => w.budget && fBudgets.includes(w.budget));
    if (fDurations.length > 0) result = result.filter((w) => w.duration && fDurations.includes(w.duration));
    if (fSeasons.length > 0) result = result.filter((w) => w.seasons.some((s) => fSeasons.includes(s)));
    if (fScoreFilter !== null) result = result.filter((w) => meetsScoreFilter(w.avgScore, fScoreFilter));
    if (fGenreIds.length > 0) {
      if (fGenreSearchMode === "AND") {
        result = result.filter((w) => fGenreIds.every((id) => w.genres.some((g) => g.id === id)));
      } else {
        result = result.filter((w) => w.genres.some((g) => fGenreIds.includes(g.id)));
      }
    }
    if (fExcludeGenreIds.length > 0) result = result.filter((w) => !w.genres.some((g) => fExcludeGenreIds.includes(g.id)));
    const fBroadIds = fRegionIds.filter((id) => regions.some((r) => r.id === id && isBroadRegionTag(r.name)));
    const fSpecificIds = fRegionIds.filter((id) => regions.some((r) => r.id === id && !isBroadRegionTag(r.name)));
    if (fBroadIds.length > 0) result = result.filter((w) => w.regions.some((r) => fBroadIds.includes(r.id)));
    if (fSpecificIds.length > 0) result = result.filter((w) => w.regions.some((r) => fSpecificIds.includes(r.id)));
    if (fExcludeRegionIds.length > 0) result = result.filter((w) => !w.regions.some((r) => fExcludeRegionIds.includes(r.id)));
    if (nearbyWishIds !== null) result = result.filter((w) => nearbyWishIds.has(w.id));
    if (historySearchQuery) {
      const q = historySearchQuery.toLowerCase();
      result = result.filter((w) => w.title.toLowerCase().includes(q));
    }
    if (sortOrder === "priority") {
      result.sort((a, b) => b.avgScore - a.avgScore);
    } else if (sortOrder === "createdAt") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      result.sort((a, b) => new Date(b.doneAt ?? 0).getTime() - new Date(a.doneAt ?? 0).getTime());
    }
    return result;
  }, [wishes, showFavoriteOnly, sortOrder, nearbyWishIds, fMemberIds, fSituations, fBudgets, fDurations, fSeasons, fScoreFilter, fGenreIds, fGenreSearchMode, fExcludeGenreIds, fRegionIds, fExcludeRegionIds, historySearchQuery, regions]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [showFavoriteOnly]);

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

  const handleToggleFavorite = async (id: string, value: boolean) => {
    try {
      await toggleFavoriteWish(id, value);
    } catch {
      toast.error("お気に入りの更新に失敗しました。DBマイグレーションを確認してください。");
    }
  };

  const handleToggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSelectAll = () => setSelectedIds(new Set(filtered.map((w) => w.id)));
  const handleClearAll = () => setSelectedIds(new Set());
  const handleExitSelection = () => { setSelectionMode(null); setSelectedIds(new Set()); };

  const handleBulkApply = async (genreIds: string[], mode: "add" | "remove") => {
    await bulkUpdateGenres([...selectedIds], genreIds, mode);
    toast.success(mode === "add" ? "ジャンルを追加しました" : "ジャンルを削除しました");
    handleExitSelection();
  };

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar
        title="実施済み"
        right={
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              searchOpen || historySearchQuery
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
        }
      />

      {searchOpen && (
        <div className="px-4 py-2 border-b border-border relative">
          <Input
            placeholder="タイトルを検索..."
            value={historySearchQuery}
            onChange={(e) => setHistorySearchQuery(e.target.value)}
            autoFocus
            className="pr-8"
          />
          {historySearchQuery && (
            <button
              type="button"
              onClick={() => setHistorySearchQuery("")}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={() => setShowFavoriteOnly((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors",
            showFavoriteOnly
              ? "border-yellow-400 text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Star size={13} fill={showFavoriteOnly ? "currentColor" : "none"} />
          お気に入り
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder((s) => { const i = SORT_CYCLE.indexOf(s); return SORT_CYCLE[(i + 1) % SORT_CYCLE.length]; })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/70"
          >
            <ArrowUpDown size={11} />
            {SORT_LABELS[sortOrder]}
          </button>
          <button
            onClick={() => setFilterOpen(true)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors",
              hasFilter
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal size={13} />
            絞り込み{hasFilter ? "中" : ""}
          </button>
        </div>
      </div>

      <FilterSummary genres={genres} regions={regions} members={group?.members ?? []} />

      <div className="flex-1 py-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <WishList
            wishes={filtered}
            genres={genres}
            regions={regions}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onToggleFavorite={handleToggleFavorite}
            selectionMode={selectionMode !== null}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            emptyMessage={showFavoriteOnly ? "お気に入りのアイテムはありません" : "実施済みのアイテムはありません"}
          />
        )}
      </div>

      {selectionMode === null && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
          <button
            onClick={() => { setSelectionMode("genre"); setSelectedIds(new Set()); }}
            className="w-10 h-10 bg-muted text-muted-foreground rounded-full shadow flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all"
            aria-label="ジャンル一括設定"
            title="ジャンル一括設定"
          >
            <Tag size={16} />
          </button>
        </div>
      )}

      {selectionMode === "genre" && (
        <BulkGenreBar
          selectedCount={selectedIds.size}
          totalCount={filtered.length}
          genres={genres}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onApply={handleBulkApply}
          onCancel={handleExitSelection}
        />
      )}

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        members={group?.members ?? []}
        genres={genres}
        regions={regions}
      />

      <BottomNav groupId={uuid} />
    </div>
  );
}
