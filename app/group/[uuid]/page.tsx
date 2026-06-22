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
import { Wish, Status, Situation, SITUATION_LABELS, SITUATION_ICONS } from "@/types";
import { Plus, SlidersHorizontal, Search, X, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabValue = "ALL" | Status;
type SortOrder = "priority" | "createdAt";

const SITUATION_TABS: { value: Situation | "ALL" | "SEASONAL"; label: string }[] = [
  { value: "ALL", label: "すべて" },
  { value: "HOME", label: `${SITUATION_ICONS.HOME} ${SITUATION_LABELS.HOME}` },
  { value: "OUTSIDE", label: `${SITUATION_ICONS.OUTSIDE} ${SITUATION_LABELS.OUTSIDE}` },
  { value: "SEASONAL", label: "🌸 季節限定" },
];

const PRIORITY_ORDER: Record<Wish["priority"], number> = {
  MAX: 0,
  GOLD: 1,
  SILVER: 2,
  BRONZE: 3,
};

export default function ListPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const group = useGroupStore((s) => s.group);
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

    if (statusTab !== "ALL") result = result.filter((w) => w.status === statusTab);

    if (situationTab === "SEASONAL") {
      result = result.filter((w) => w.seasons.length > 0);
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
      result.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
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

      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
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
      </div>

      <div className="flex items-center gap-2 px-4 py-1 mb-2">
        <button
          onClick={() => setFilterOpen(true)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            hasActiveFilters
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          <SlidersHorizontal size={12} />
          絞り込み{hasActiveFilters && " ●"}
        </button>
        <button
          onClick={() => setSortOrder((s) => s === "priority" ? "createdAt" : "priority")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
        >
          <ArrowUpDown size={12} />
          {sortOrder === "priority" ? "やりたい度順" : "新着順"}
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
          emptyMessage={statusTab === "PENDING" ? "やりたいことを追加しよう！" : "該当するアイテムがありません"}
        />
      )}

      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="追加"
      >
        <Plus size={24} />
      </button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>やりたいことを追加</DialogTitle>
          </DialogHeader>
          <WishForm
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
