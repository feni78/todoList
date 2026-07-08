"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { StatusTabs } from "@/components/list/StatusTabs";
import { WishList } from "@/components/list/WishList";
import { WishForm } from "@/components/list/WishForm";
import { FilterPanel } from "@/components/list/FilterPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWishes } from "@/hooks/useWishes";
import { useGroupStore } from "@/lib/store/groupStore";
import { useFilterStore } from "@/lib/store/filterStore";
import { getGroupMember } from "@/lib/utils/localStorage";
import { Status, Situation, Season, SITUATION_LABELS, SITUATION_ICONS } from "@/types";
import { Plus, SlidersHorizontal, Search, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabValue = "PENDING" | "HOLD";
type SortOrder = "priority" | "createdAt";

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "SPRING";
  if (month >= 6 && month <= 9) return "SUMMER";
  if (month >= 10 && month <= 11) return "AUTUMN";
  return "WINTER";
}

const SEASON_ICONS: Record<Season, string> = {
  SPRING: "🌸",
  SUMMER: "🍉",
  AUTUMN: "🍁",
  WINTER: "⛄",
};

const SITUATION_TABS: { value: Situation | "ALL" | "SEASONAL"; label: string }[] = [
  { value: "ALL", label: "すべて" },
  { value: "HOME", label: `${SITUATION_ICONS.HOME} ${SITUATION_LABELS.HOME}` },
  { value: "OUTSIDE", label: `${SITUATION_ICONS.OUTSIDE} ${SITUATION_LABELS.OUTSIDE}` },
  { value: "SEASONAL", label: `${SEASON_ICONS[getCurrentSeason()]} 季節限定` },
];

export default function ListPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const group = useGroupStore((s) => s.group);
  const currentMemberId = getGroupMember(uuid)?.memberId;
  const { wishes, loading, createWish, updateWish, deleteWish, changeStatus } = useWishes(uuid);
  const filterStore = useFilterStore();

  const [statusTab, setStatusTab] = useState<TabValue>("PENDING");

  const [situationTab, setSituationTab] = useState<"ALL" | Situation | "SEASONAL">("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("priority");
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    let result = [...wishes];

    result = result.filter((w) => w.status === statusTab);

    if (situationTab === "SEASONAL") {
      const season = getCurrentSeason();
      result = result.filter((w) => w.seasons.includes(season));
    } else if (situationTab !== "ALL") {
      result = result.filter((w) => w.situation === situationTab || w.situation === "EITHER");
    }

    if (filterStore.memberIds.length > 0) {
      result = result.filter((w) => filterStore.memberIds.includes(w.memberId));
    }
    if (filterStore.situations.length > 0) {
      result = result.filter((w) => filterStore.situations.includes(w.situation));
    }
    if (filterStore.statuses.length > 0) {
      result = result.filter((w) => filterStore.statuses.includes(w.status));
    }
    if (filterStore.budgets.length > 0) {
      result = result.filter((w) => w.budget && filterStore.budgets.includes(w.budget));
    }
    if (filterStore.durations.length > 0) {
      result = result.filter((w) => w.duration && filterStore.durations.includes(w.duration));
    }
    if (filterStore.seasons.length > 0) {
      result = result.filter((w) => w.seasons.some((s) => filterStore.seasons.includes(s)));
    }
    if (filterStore.searchQuery) {
      const q = filterStore.searchQuery.toLowerCase();
      result = result.filter((w) => w.title.toLowerCase().includes(q));
    }

    if (sortOrder === "priority") {
      result.sort((a, b) => b.avgScore - a.avgScore);
    }

    return result;
  }, [wishes, statusTab, situationTab, sortOrder, filterStore]);

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

  const handleStatusChange = async (id: string, status: Status) => {
    try {
      await changeStatus(id, status);
    } catch {
      toast.error("ステータスの変更に失敗しました");
    }
  };

  const hasActiveFilters =
    filterStore.memberIds.length > 0 ||
    filterStore.situations.length > 0 ||
    filterStore.statuses.length > 0 ||
    filterStore.budgets.length > 0 ||
    filterStore.durations.length > 0 ||
    filterStore.seasons.length > 0;

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar
        right={
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
        }
      />

      {searchOpen && (
        <div className="px-4 py-2 border-b border-border">
          <Input
            placeholder="タイトルを検索..."
            value={filterStore.searchQuery}
            onChange={(e) => filterStore.setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      <StatusTabs value={statusTab} onChange={setStatusTab} />

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
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="絞り込み"
        >
          <SlidersHorizontal size={16} />
          {hasActiveFilters && <span className="sr-only">●</span>}
        </button>
      </div>

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
          emptyMessage={statusTab === "PENDING" ? "やりたいことを追加しよう！" : "保留中のアイテムはありません"}
        />
      )}

      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="追加"
      >
        <Plus size={24} />
      </button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain">
          <DialogHeader>
            <DialogTitle>やりたいことを追加</DialogTitle>
          </DialogHeader>
          <WishForm
            currentMemberId={currentMemberId}
            onSubmit={handleCreate}
            onCancel={() => setAddOpen(false)}
            loading={adding}
          />
        </DialogContent>
      </Dialog>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        members={group?.members ?? []}
      />

      <BottomNav groupId={uuid} />
    </div>
  );
}
