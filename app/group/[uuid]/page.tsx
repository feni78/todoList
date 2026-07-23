"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { StatusTabs } from "@/components/list/StatusTabs";
import { WishList } from "@/components/list/WishList";
import { WishForm } from "@/components/list/WishForm";
import { FilterPanel } from "@/components/list/FilterPanel";
import { CsvImportDialog } from "@/components/list/CsvImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWishes } from "@/hooks/useWishes";
import { useGenres } from "@/hooks/useGenres";
import { useRegions } from "@/hooks/useRegions";
import { useGroupStore } from "@/lib/store/groupStore";
import { useFilterStore } from "@/lib/store/filterStore";
import { getGroupMember } from "@/lib/utils/localStorage";
import { isBroadRegionTag } from "@/lib/utils/regionTag";
import { Status, Situation, SITUATION_LABELS, SITUATION_ICONS } from "@/types";
import { Plus, SlidersHorizontal, Search, X, ArrowUpDown, Tag } from "lucide-react";
import { BulkGenreBar } from "@/components/list/BulkGenreBar";
import { BulkDeleteBar } from "@/components/list/BulkDeleteBar";
import { FilterSummary } from "@/components/list/FilterSummary";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { findStation } from "@/lib/utils/station";

type TabValue = "PENDING" | "HOLD";
type SortOrder = "priority" | "createdAt";


const SITUATION_TABS: { value: Situation | "ALL"; label: string }[] = [
  { value: "ALL", label: "すべて" },
  { value: "HOME", label: `${SITUATION_ICONS.HOME} ${SITUATION_LABELS.HOME}` },
  { value: "OUTSIDE", label: `${SITUATION_ICONS.OUTSIDE} ${SITUATION_LABELS.OUTSIDE}` },
];

export default function ListPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const group = useGroupStore((s) => s.group);
  const currentMemberId = getGroupMember(uuid)?.memberId;
  const { wishes, loading, createWish, updateWish, deleteWish, bulkDeleteWishes, changeStatus, bulkUpdateGenres, refetch } = useWishes(uuid);
  const { genres } = useGenres(uuid);
  const { regions } = useRegions(uuid);
  const filterStore = useFilterStore();

  const [statusTab, setStatusTab] = useState<TabValue>("PENDING");

  const [situationTab, setSituationTab] = useState<"ALL" | Situation>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("priority");
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"genre" | "delete" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nearbyWishIds, setNearbyWishIds] = useState<Set<string> | null>(null);
  const nearbyKmRef = useRef<number | null>(null);

  useEffect(() => {
    const km = filterStore.nearbyKm;
    const stationName = filterStore.stationName;
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
            p_group_id: uuid,
            p_lat: station.lat,
            p_lng: station.lng,
            p_max_km: km,
            p_limit: 500,
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
          p_group_id: uuid,
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
          p_max_km: km,
          p_limit: 500,
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
  }, [filterStore.nearbyKm, filterStore.stationName, uuid]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "delete") {
      setSelectionMode("delete");
      setSelectedIds(new Set());
      window.history.replaceState({}, "", `/group/${uuid}`);
    }
  }, [uuid]);

  const {
    memberIds: fMemberIds,
    situations: fSituations,
    statuses: fStatuses,
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

  const filtered = useMemo(() => {
    let result = [...wishes];

    result = result.filter((w) => w.status === statusTab);

    if (situationTab !== "ALL") {
      result = result.filter((w) => w.situation === situationTab || w.situation === "EITHER");
    }

    if (fMemberIds.length > 0) result = result.filter((w) => fMemberIds.includes(w.memberId));
    if (fSituations.length > 0) result = result.filter((w) => fSituations.includes(w.situation));
    if (fStatuses.length > 0) result = result.filter((w) => fStatuses.includes(w.status));
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
    if (nearbyWishIds !== null) result = result.filter((w) => nearbyWishIds.has(w.id));
    if (fSearchQuery) {
      const q = fSearchQuery.toLowerCase();
      result = result.filter((w) => w.title.toLowerCase().includes(q));
    }

    if (sortOrder === "priority") {
      result.sort((a, b) => b.avgScore - a.avgScore);
    }

    return result;
  }, [wishes, statusTab, situationTab, sortOrder, nearbyWishIds, fMemberIds, fSituations, fStatuses, fBudgets, fDurations, fSeasons, fGenreIds, fGenreSearchMode, fExcludeGenreIds, fRegionIds, fExcludeRegionIds, fSearchQuery]);

  const handleCreate = async (data: Parameters<typeof createWish>[0]) => {
    setAdding(true);
    try {
      await createWish(data);
      setAddOpen(false);
      toast.success("追加しました！");
    } catch {
      toast.error("追加に失敗しました");
    } finally {
      setAdding(false);
    }
  };

  const handleBulkCreate = async () => {
    const titles = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (titles.length === 0) return;
    setBulkAdding(true);
    try {
      for (const title of titles) {
        await createWish({ title, situation: "OUTSIDE", status: "PENDING", seasons: [] });
      }
      setBulkOpen(false);
      setBulkText("");
      toast.success(`${titles.length}件追加しました！`);
    } catch {
      toast.error("追加に失敗しました");
    } finally {
      setBulkAdding(false);
    }
  };

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

  const handleToggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSelectAll = () => setSelectedIds(new Set(filtered.map((w) => w.id)));
  const handleClearAll = () => setSelectedIds(new Set());

  const handleExitSelection = () => {
    setSelectionMode(null);
    setSelectedIds(new Set());
  };

  const handleStatusTabChange = (tab: TabValue) => {
    setStatusTab(tab);
    setSelectionMode(null);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    try {
      await bulkDeleteWishes([...selectedIds]);
      toast.success(`${count}件を削除しました`);
      handleExitSelection();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleBulkApply = async (genreIds: string[], mode: "add" | "remove") => {
    await bulkUpdateGenres([...selectedIds], genreIds, mode);
    toast.success(mode === "add" ? "ジャンルを追加しました" : "ジャンルを削除しました");
    handleExitSelection();
  };

  const handleStatusChange = async (id: string, status: Status) => {
    try {
      await changeStatus(id, status);
    } catch {
      toast.error("ステータスの変更に失敗しました");
    }
  };

  const excludeChanged =
    filterStore.excludeGenreIds.some((id) => !filterStore.defaultExcludeGenreIds.includes(id)) ||
    filterStore.defaultExcludeGenreIds.some((id) => !filterStore.excludeGenreIds.includes(id)) ||
    filterStore.excludeRegionIds.some((id) => !filterStore.defaultExcludeRegionIds.includes(id)) ||
    filterStore.defaultExcludeRegionIds.some((id) => !filterStore.excludeRegionIds.includes(id));

  const hasActiveFilters =
    filterStore.memberIds.length > 0 ||
    filterStore.situations.length > 0 ||
    filterStore.statuses.length > 0 ||
    filterStore.budgets.length > 0 ||
    filterStore.durations.length > 0 ||
    filterStore.seasons.length > 0 ||
    filterStore.genreIds.length > 0 ||
    filterStore.regionIds.length > 0 ||
    filterStore.nearbyKm !== null ||
    excludeChanged;

  return (
    <div className="flex flex-col min-h-screen pb-40">
      <TopBar
        right={
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              searchOpen || filterStore.searchQuery
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
            value={filterStore.searchQuery}
            onChange={(e) => filterStore.setSearchQuery(e.target.value)}
            autoFocus
            className="pr-8"
          />
          {filterStore.searchQuery && (
            <button
              type="button"
              onClick={() => filterStore.setSearchQuery("")}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      <StatusTabs value={statusTab} onChange={handleStatusTabChange} />

      <div className="flex items-center gap-1.5 px-3 py-3 mt-2 mb-1 overflow-x-auto scrollbar-none">
        {SITUATION_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSituationTab(tab.value)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              situationTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setSortOrder((s) => s === "priority" ? "createdAt" : "priority")}
          className={cn(
            "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          <ArrowUpDown size={11} />
          {sortOrder === "priority" ? "やりたい度順" : "新着順"}
        </button>
        <button
          onClick={() => setFilterOpen(true)}
          className={cn(
            "shrink-0 p-1.5 rounded-lg transition-colors",
            hasActiveFilters
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="絞り込み"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <FilterSummary genres={genres} regions={regions} members={group?.members ?? []} />

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
          selectionMode={selectionMode !== null}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          emptyMessage={statusTab === "PENDING" ? "やりたいことを追加しよう！" : "保留中のアイテムはありません"}
        />
      )}

      {selectionMode === null && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
          <button
            onClick={() => setCsvOpen(true)}
            className="w-10 h-10 bg-muted text-muted-foreground rounded-full shadow flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all text-xs font-bold"
            aria-label="CSV取り込み"
            title="CSV取り込み"
          >
            CSV
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="w-10 h-10 bg-muted text-muted-foreground rounded-full shadow flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all text-xs font-bold"
            aria-label="一括追加"
            title="一括追加"
          >
            一括
          </button>
          <button
            onClick={() => { setSelectionMode("genre"); setSelectedIds(new Set()); }}
            className="w-10 h-10 bg-muted text-muted-foreground rounded-full shadow flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all"
            aria-label="ジャンル一括設定"
            title="ジャンル一括設定"
          >
            <Tag size={16} />
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
            aria-label="追加"
          >
            <Plus size={24} />
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
      {selectionMode === "delete" && (
        <BulkDeleteBar
          selectedCount={selectedIds.size}
          totalCount={filtered.length}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onDelete={handleBulkDelete}
          onCancel={handleExitSelection}
        />
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain">
          <DialogHeader>
            <DialogTitle>やりたいことを追加</DialogTitle>
          </DialogHeader>
          <WishForm
            currentMemberId={currentMemberId}
            genres={genres}
            regions={regions}
            onSubmit={handleCreate}
            onCancel={() => setAddOpen(false)}
            loading={adding}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(v) => { setBulkOpen(v); if (!v) setBulkText(""); }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>一括追加</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">1行に1件ずつ入力してください。シチュエーションは「外」、やりたい度は後で設定できます。</p>
            <textarea
              className="w-full h-48 rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={"温泉旅行\n映画を見る\nディズニーランド"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {bulkText.split("\n").filter((l) => l.trim()).length}件
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setBulkOpen(false); setBulkText(""); }}>
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleBulkCreate}
                disabled={bulkAdding || !bulkText.trim()}
              >
                {bulkAdding ? "追加中..." : "一括登録"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        members={group?.members ?? []}
        genres={genres}
        regions={regions}
      />

      <CsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImportComplete={refetch}
        groupId={uuid}
        genres={genres}
      />

      <BottomNav groupId={uuid} />
    </div>
  );
}
