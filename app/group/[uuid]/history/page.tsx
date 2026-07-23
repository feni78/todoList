"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { WishList } from "@/components/list/WishList";
import { FilterPanel } from "@/components/list/FilterPanel";
import { useWishes } from "@/hooks/useWishes";
import { useGenres } from "@/hooks/useGenres";
import { useRegions } from "@/hooks/useRegions";
import { useGroupStore } from "@/lib/store/groupStore";
import { useFilterStore } from "@/lib/store/filterStore";
import { isBroadRegionTag } from "@/lib/utils/regionTag";
import { toast } from "sonner";
import { Star, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const group = useGroupStore((s) => s.group);
  const { wishes, loading, updateWish, deleteWish, changeStatus, toggleFavorite: toggleFavoriteWish } = useWishes(uuid, { statuses: ["DONE"] });
  const { genres } = useGenres(uuid);
  const { regions } = useRegions(uuid);
  const filterStore = useFilterStore();

  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    memberIds: fMemberIds,
    budgets: fBudgets,
    durations: fDurations,
    seasons: fSeasons,
    genreIds: fGenreIds,
    genreSearchMode: fGenreSearchMode,
    excludeGenreIds: fExcludeGenreIds,
    regionIds: fRegionIds,
    excludeRegionIds: fExcludeRegionIds,
    searchQuery: fSearchQuery,
  } = filterStore;

  const hasFilter =
    fMemberIds.length > 0 ||
    fBudgets.length > 0 ||
    fDurations.length > 0 ||
    fSeasons.length > 0 ||
    fGenreIds.length > 0 ||
    fExcludeGenreIds.length > 0 ||
    fRegionIds.length > 0 ||
    fExcludeRegionIds.length > 0 ||
    !!fSearchQuery;

  const filtered = useMemo(() => {
    let result = [...wishes];
    if (showFavoriteOnly) result = result.filter((w) => w.isFavorite);
    if (fMemberIds.length > 0) result = result.filter((w) => fMemberIds.includes(w.memberId));
    if (fBudgets.length > 0) result = result.filter((w) => w.budget && fBudgets.includes(w.budget));
    if (fDurations.length > 0) result = result.filter((w) => w.duration && fDurations.includes(w.duration));
    if (fSeasons.length > 0) result = result.filter((w) => w.seasons.some((s) => fSeasons.includes(s)));
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
    if (fSearchQuery) {
      const q = fSearchQuery.toLowerCase();
      result = result.filter((w) => w.title.toLowerCase().includes(q));
    }
    return result;
  }, [wishes, showFavoriteOnly, fMemberIds, fBudgets, fDurations, fSeasons, fGenreIds, fGenreSearchMode, fExcludeGenreIds, fRegionIds, fExcludeRegionIds, fSearchQuery, regions]);

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

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar title="実施済み" />

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

      <div className="flex-1 py-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <WishList
            wishes={filtered}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onToggleFavorite={handleToggleFavorite}
            emptyMessage={showFavoriteOnly ? "お気に入りのアイテムはありません" : "実施済みのアイテムはありません"}
          />
        )}
      </div>

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
