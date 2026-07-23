"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGroup } from "@/hooks/useGroup";
import { useGenres } from "@/hooks/useGenres";
import { useRegions } from "@/hooks/useRegions";
import { isBroadRegionTag } from "@/lib/utils/regionTag";
import { useTrash } from "@/hooks/useTrash";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { useCsvImportLogs } from "@/hooks/useCsvImportLogs";
import { useCsvImport } from "@/hooks/useCsvImport";
import { Code2 } from "lucide-react";
import { useWishes } from "@/hooks/useWishes";
import { useGroupStore } from "@/lib/store/groupStore";
import { getDarkMode, setDarkMode, getGroupMember, saveGroupMember, getDefaultExcludeGenreIds, saveDefaultExcludeGenreIds, getDefaultExcludeRegionIds, saveDefaultExcludeRegionIds } from "@/lib/utils/localStorage";
import { useFilterStore } from "@/lib/store/filterStore";
import { RouletteSettings, Wish } from "@/types";
import { Copy, Check, Download, Upload, Trash2, Pencil, Plus, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export default function SettingsPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const { fetchRouletteSettings, saveRouletteSettings } = useGroup();
  const { settings, setSettings, devMode, setDevMode } = useRouletteStore();
  const { wishes, createWish, updateWish } = useWishes(uuid, { statuses: ["PENDING", "HOLD", "DONE"] });
  const { group, setGroup, setCurrentMember } = useGroupStore();
  const currentMemberId = getGroupMember(uuid)?.memberId;
  const [darkMode, setDarkModeState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [switchingUser, setSwitchingUser] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const { genres, createGenre, updateGenre, deleteGenre, reorderGenres } = useGenres(uuid);
  const { regions, createRegion, updateRegion, deleteRegion, reorderRegions } = useRegions(uuid);
  const { items: trashItems, loading: trashLoading, fetchTrash, restoreWish, permanentDelete, emptyTrash } = useTrash(uuid);
  const { logs: importLogs, loading: logsLoading, error: logsError, fetchLogs } = useCsvImportLogs(uuid);
  const { retryLocationEnrichment } = useCsvImport(uuid);
  const [trashOpen, setTrashOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null);
  const [editingGenreName, setEditingGenreName] = useState("");
  const [addingGenre, setAddingGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [retryingLocation, setRetryingLocation] = useState(false);
  const [genreSectionOpen, setGenreSectionOpen] = useState(false);
  const [broadRegionSectionOpen, setBroadRegionSectionOpen] = useState(false);
  const [specificRegionSectionOpen, setSpecificRegionSectionOpen] = useState(false);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState("");
  const [addingRegion, setAddingRegion] = useState(false);
  const [newRegionName, setNewRegionName] = useState("");
  const [defaultExcludeIds, setDefaultExcludeIds] = useState<string[]>(() => getDefaultExcludeGenreIds(uuid ?? ""));
  const [defaultExcludeRegionIds, setDefaultExcludeRegionIdsState] = useState<string[]>(() => getDefaultExcludeRegionIds(uuid ?? ""));
  const [defaultExcludeGenreSectionOpen, setDefaultExcludeGenreSectionOpen] = useState(false);
  const [defaultExcludeRegionSectionOpen, setDefaultExcludeRegionSectionOpen] = useState(false);
  const [regionlessSectionOpen, setRegionlessSectionOpen] = useState(false);
  const [regionlessExpandedId, setRegionlessExpandedId] = useState<string | null>(null);
  const [savingRegionWishId, setSavingRegionWishId] = useState<string | null>(null);
  const { setDefaultExcludeGenreIds, setExcludeGenreIds, setDefaultExcludeRegionIds, setExcludeRegionIds } = useFilterStore();

  const toggleDefaultExclude = (genreId: string) => {
    const next = defaultExcludeIds.includes(genreId)
      ? defaultExcludeIds.filter((id) => id !== genreId)
      : [...defaultExcludeIds, genreId];
    setDefaultExcludeIds(next);
    saveDefaultExcludeGenreIds(uuid, next);
    setDefaultExcludeGenreIds(next);
    setExcludeGenreIds(next);
  };

  const toggleDefaultExcludeRegion = (regionId: string) => {
    const next = defaultExcludeRegionIds.includes(regionId)
      ? defaultExcludeRegionIds.filter((id) => id !== regionId)
      : [...defaultExcludeRegionIds, regionId];
    setDefaultExcludeRegionIdsState(next);
    saveDefaultExcludeRegionIds(uuid, next);
    setDefaultExcludeRegionIds(next);
    setExcludeRegionIds(next);
  };

  useEffect(() => {
    setDarkModeState(getDarkMode());
    fetchRouletteSettings(uuid).then((data) => {
      if (data) {
        setSettings({
          considerLevel: (data as { consider_level: number }).consider_level,
        });
      }
    });
  }, [uuid, fetchRouletteSettings, setSettings]);

  const handleDarkMode = (val: boolean) => {
    setDarkModeState(val);
    setDarkMode(val);
    if (val) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRouletteSettings(uuid, settings);
      toast.success("設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const data = wishes.map((w) => ({
      title: w.title,
      situation: w.situation,
      status: w.status,
      memo: w.memo,
      budget: w.budget,
      duration: w.duration,
      seasons: w.seasons,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yaritai_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("エクスポートしました");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<Wish>[];
      if (!Array.isArray(data)) throw new Error("不正なフォーマットです");
      let imported = 0;
      let skipped = 0;
      for (const item of data) {
        if (!item.title) continue;
        const isDuplicate = wishes.some(
          (w) =>
            w.title === item.title &&
            w.situation === (item.situation ?? "HOME") &&
            w.status === (item.status ?? "PENDING") &&
            (w.memo ?? "") === (item.memo ?? "") &&
            (w.budget ?? "") === (item.budget ?? "") &&
            (w.duration ?? "") === (item.duration ?? "") &&
            JSON.stringify([...(w.seasons ?? [])].sort()) === JSON.stringify([...(item.seasons ?? [])].sort())
        );
        if (isDuplicate) { skipped++; continue; }
        await createWish({
          title: item.title,
          situation: item.situation ?? "HOME",
          status: item.status ?? "PENDING",
          memo: item.memo,
          budget: item.budget,
          duration: item.duration,
          seasons: item.seasons ?? [],
        });
        imported++;
      }
      toast.success(`${imported}件インポート${skipped > 0 ? `（重複${skipped}件スキップ）` : ""}`);
    } catch {
      toast.error("インポートに失敗しました");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteMember = async (memberId: string, nickname: string) => {
    if (!confirm(`「${nickname}」を削除してよろしいですか？\nこのユーザーのタスクは残ります。`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_members").delete().eq("id", memberId);
    if (error) {
      toast.error("削除に失敗しました");
    } else {
      toast.success(`「${nickname}」を削除しました`);
      if (group) {
        setGroup({ ...group, members: group.members.filter((m) => m.id !== memberId) });
      }
    }
  };

  const handleEditMember = async (memberId: string) => {
    const name = editingNickname.trim();
    if (!name) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_members").update({ nickname: name }).eq("id", memberId);
    if (error) {
      toast.error("更新に失敗しました");
    } else {
      toast.success("名前を変更しました");
      if (group) {
        setGroup({ ...group, members: group.members.map((m) => m.id === memberId ? { ...m, nickname: name } : m) });
      }
      if (memberId === currentMemberId) {
        const stored = getGroupMember(uuid);
        if (stored) saveGroupMember({ ...stored, nickname: name });
      }
      setEditingMemberId(null);
    }
  };

  const handleAddMember = async () => {
    const name = newNickname.trim();
    if (!name) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("group_members").insert({ group_id: uuid, nickname: name }).select().single();
    if (error) {
      toast.error("追加に失敗しました");
    } else {
      toast.success(`「${name}」を追加しました`);
      if (group) {
        setGroup({ ...group, members: [...group.members, data as { id: string; nickname: string; groupId: string }] });
      }
      setNewNickname("");
      setAddingMember(false);
    }
  };

  const handleSwitchMember = (member: { id: string; nickname: string }) => {
    saveGroupMember({
      groupId: uuid,
      groupName: group?.name ?? "",
      memberId: member.id,
      nickname: member.nickname,
      lastVisitedAt: new Date().toISOString(),
    });
    setCurrentMember({ id: member.id, groupId: uuid, nickname: member.nickname });
    setSwitchingUser(false);
    toast.success(`「${member.nickname}」に切り替えました`);
  };

  const handleUpdateGroupName = async () => {
    if (!groupNameInput.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("groups").update({ name: groupNameInput.trim() }).eq("id", uuid);
    if (error) { toast.error("更新に失敗しました"); return; }
    setGroup({ ...group!, name: groupNameInput.trim() });
    document.title = groupNameInput.trim();
    setEditingGroupName(false);
    toast.success("グループ名を更新しました");
  };

  const moveGenre = async (index: number, dir: -1 | 1) => {
    const next = [...genres];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await reorderGenres(next.map((g) => g.id));
  };

  const moveRegion = async (index: number, dir: -1 | 1) => {
    const next = [...regions];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await reorderRegions(next.map((r) => r.id));
  };

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) return;
    try {
      await createRegion(newRegionName.trim());
      setAddingRegion(false);
      setNewRegionName("");
      toast.success("地域タグを追加しました");
    } catch {
      toast.error("追加に失敗しました");
    }
  };

  const handleEditRegion = async (id: string) => {
    if (!editingRegionName.trim()) return;
    try {
      await updateRegion(id, editingRegionName.trim());
      setEditingRegionId(null);
      toast.success("地域タグを更新しました");
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDeleteRegion = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？このタグが設定されたタスクからも外れます。`)) return;
    try {
      await deleteRegion(id);
      toast.success("地域タグを削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleAddGenre = async () => {
    if (!newGenreName.trim()) return;
    try {
      await createGenre(newGenreName.trim());
      setAddingGenre(false);
      setNewGenreName("");
      toast.success("ジャンルを追加しました");
    } catch {
      toast.error("追加に失敗しました");
    }
  };

  const handleEditGenre = async (id: string) => {
    if (!editingGenreName.trim()) return;
    try {
      await updateGenre(id, editingGenreName.trim());
      setEditingGenreId(null);
      toast.success("ジャンルを更新しました");
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDeleteGenre = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？このジャンルが設定されたタスクからも外れます。`)) return;
    try {
      await deleteGenre(id);
      toast.success("ジャンルを削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleRetryLocation = async () => {
    setRetryingLocation(true);
    try {
      const result = await retryLocationEnrichment();
      if (!result) {
        toast.success("位置情報未設定でGoogle MapsのURLを持つデータはありませんでした");
      } else if (result.failed.length === 0) {
        toast.success(`位置情報を${result.succeeded}件取得しました`);
      } else {
        const failDetails = result.failed.slice(0, 5).map((f) => `・${f.title}: ${f.reason}`).join("\n")
          + (result.failed.length > 5 ? `\n他${result.failed.length - 5}件` : "");
        toast.warning(`${result.succeeded}件成功 / ${result.failed.length}件失敗`, {
          description: failDetails,
          duration: 10000,
        });
      }
    } catch {
      toast.error("位置情報の再取得に失敗しました");
    } finally {
      setRetryingLocation(false);
    }
  };

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/group/${uuid}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URLをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar title="設定" />

      <div className="flex-1 flex flex-col gap-6 p-4 pb-8 max-w-md mx-auto w-full">
        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">グループ</h2>
          {editingGroupName ? (
            <div className="flex items-center gap-2">
              <input
                className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 bg-background"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUpdateGroupName(); if (e.key === "Escape") setEditingGroupName(false); }}
                autoFocus
              />
              <button onClick={handleUpdateGroupName} className="p-1.5 text-primary transition-colors">
                <Check size={15} />
              </button>
              <button onClick={() => setEditingGroupName(false)} className="p-1.5 text-muted-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm">{group?.name}</span>
              <button
                onClick={() => { setGroupNameInput(group?.name ?? ""); setEditingGroupName(true); }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil size={15} />
              </button>
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">ルーレット設定</h2>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <Label>忖度レベル</Label>
              <span className="text-sm font-mono text-muted-foreground">{settings.considerLevel}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={10}
              value={[settings.considerLevel]}
              onValueChange={(vals) => {
                const v = Array.isArray(vals) ? (vals as number[])[0] : (vals as number);
                setSettings({ ...settings, considerLevel: v });
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>完全ランダム</span>
              <span>MAXのみ</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "ルーレット設定を保存"}
          </Button>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">表示</h2>
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode">ダークモード</Label>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={handleDarkMode}
            />
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">データ</h2>
          <p className="text-sm text-muted-foreground">タスクをJSONファイルでエクスポート・インポートできます</p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleExport} className="w-full gap-2">
              <Download size={16} />
              エクスポート（{wishes.length}件）
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full gap-2"
            >
              <Upload size={16} />
              {importing ? "インポート中..." : "インポート"}
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <Button
              variant="outline"
              onClick={handleRetryLocation}
              disabled={retryingLocation}
              className="w-full gap-2"
            >
              <MapPin size={16} />
              {retryingLocation ? "取得中..." : "位置情報を再取得"}
            </Button>
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">ログインユーザー</h2>
          {switchingUser ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground mb-1">切り替えるユーザーを選択</p>
              {(group?.members ?? []).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSwitchMember(m)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors",
                    m.id === currentMemberId
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="flex-1">{m.nickname}</span>
                  {m.id === currentMemberId && <Check size={14} />}
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSwitchingUser(false)} className="mt-1">
                キャンセル
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm">{group?.members.find((m) => m.id === currentMemberId)?.nickname ?? "不明"}</span>
              <Button variant="outline" size="sm" onClick={() => setSwitchingUser(true)}>
                切り替え
              </Button>
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">メンバー管理</h2>
            <button
              onClick={() => { setAddingMember(true); setNewNickname(""); }}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {(group?.members ?? []).map((m) => (
              <div key={m.id} className="flex items-center gap-2 py-1">
                {editingMemberId === m.id ? (
                  <>
                    <input
                      className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                      value={editingNickname}
                      onChange={(e) => setEditingNickname(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleEditMember(m.id); if (e.key === "Escape") setEditingMemberId(null); }}
                      autoFocus
                    />
                    <button onClick={() => handleEditMember(m.id)} className="p-1.5 text-primary transition-colors">
                      <Check size={15} />
                    </button>
                    <button onClick={() => setEditingMemberId(null)} className="p-1.5 text-muted-foreground transition-colors">
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">
                      {m.nickname}
                      {m.id === currentMemberId && (
                        <span className="ml-2 text-xs text-muted-foreground">（あなた）</span>
                      )}
                    </span>
                    <button
                      onClick={() => { setEditingMemberId(m.id); setEditingNickname(m.nickname); }}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    {m.id !== currentMemberId && (
                      <button
                        onClick={() => handleDeleteMember(m.id, m.nickname)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            {addingMember && (
              <div className="flex items-center gap-2 py-1">
                <input
                  className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                  placeholder="ニックネーム"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddMember(); if (e.key === "Escape") setAddingMember(false); }}
                  autoFocus
                />
                <button onClick={handleAddMember} className="p-1.5 text-primary transition-colors">
                  <Check size={15} />
                </button>
                <button onClick={() => setAddingMember(false)} className="p-1.5 text-muted-foreground transition-colors">
                  <X size={15} />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1 flex-1 text-left"
              onClick={() => setGenreSectionOpen((v) => !v)}
            >
              <h2 className="font-semibold flex-1">ジャンル管理</h2>
              {genreSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>
            {genreSectionOpen && (
              <button
                onClick={() => { setAddingGenre(true); setNewGenreName(""); }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors ml-2"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          {genreSectionOpen && <div className="flex flex-col gap-2">
            {(() => {
              return genres.map((g, idx) => (
                <div key={g.id} className="flex items-center gap-2 py-1">
                  {editingGenreId === g.id ? (
                    <>
                      <input
                        className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                        value={editingGenreName}
                        onChange={(e) => setEditingGenreName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditGenre(g.id); if (e.key === "Escape") setEditingGenreId(null); }}
                        autoFocus
                      />
                      <button onClick={() => handleEditGenre(g.id)} className="p-1.5 text-primary transition-colors">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditingGenreId(null)} className="p-1.5 text-muted-foreground transition-colors">
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <button onClick={() => moveGenre(idx, -1)} disabled={idx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                          <ArrowUp size={12} />
                        </button>
                        <button onClick={() => moveGenre(idx, 1)} disabled={idx === genres.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                          <ArrowDown size={12} />
                        </button>
                      </div>
                      <span className="flex-1 text-sm">{g.name}</span>
                      <button onClick={() => { setEditingGenreId(g.id); setEditingGenreName(g.name); }} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDeleteGenre(g.id, g.name)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              ));
            })()}
            {addingGenre && (
              <div className="flex items-center gap-2 py-1">
                <input
                  className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                  placeholder="ジャンル名"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddGenre(); if (e.key === "Escape") setAddingGenre(false); }}
                  autoFocus
                />
                <button onClick={handleAddGenre} className="p-1.5 text-primary transition-colors">
                  <Check size={15} />
                </button>
                <button onClick={() => setAddingGenre(false)} className="p-1.5 text-muted-foreground transition-colors">
                  <X size={15} />
                </button>
              </div>
            )}
            {genres.length === 0 && !addingGenre && (
              <p className="text-sm text-muted-foreground">+ボタンでジャンルを追加できます</p>
            )}
          </div>}
        </section>

        {genres.length > 0 && (
          <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
            <button
              type="button"
              className="flex items-center gap-1 text-left"
              onClick={() => setDefaultExcludeGenreSectionOpen((v) => !v)}
            >
              <div className="flex-1">
                <h2 className="font-semibold">デフォルト非表示ジャンル</h2>
                <p className="text-xs text-muted-foreground mt-0.5">タップしたジャンルはデフォルトで除外されます</p>
              </div>
              {defaultExcludeGenreSectionOpen ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
            </button>
            {defaultExcludeGenreSectionOpen && (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => {
                  const excluded = defaultExcludeIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleDefaultExclude(g.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        excluded
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      {excluded ? `✕ ${g.name}` : g.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {(() => {
          const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
          if (broadRegions.length === 0) return null;
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <button
                type="button"
                className="flex items-center gap-1 text-left"
                onClick={() => setDefaultExcludeRegionSectionOpen((v) => !v)}
              >
                <div className="flex-1">
                  <h2 className="font-semibold">デフォルト非表示中地域タグ</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">タップした中地域タグはデフォルトで除外されます</p>
                </div>
                {defaultExcludeRegionSectionOpen ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
              </button>
              {defaultExcludeRegionSectionOpen && (
                <div className="flex flex-wrap gap-2">
                  {broadRegions.map((r) => {
                    const excluded = defaultExcludeRegionIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleDefaultExcludeRegion(r.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                          excluded
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                      >
                        {excluded ? `✕ ${r.name}` : r.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

        {/* 中地域タグ管理 */}
        {(() => {
          const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-1 flex-1 text-left"
                  onClick={() => setBroadRegionSectionOpen((v) => !v)}
                >
                  <h2 className="font-semibold flex-1">中地域タグ管理</h2>
                  {broadRegionSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
                {broadRegionSectionOpen && (
                  <button
                    onClick={() => { setAddingRegion(true); setNewRegionName(""); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors ml-2"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              {broadRegionSectionOpen && (
                <div className="flex flex-col gap-2">
                  {broadRegions.map((r, idx) => (
                    <div key={r.id} className="flex items-center gap-2 py-1">
                      {editingRegionId === r.id ? (
                        <>
                          <input
                            className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                            value={editingRegionName}
                            onChange={(e) => setEditingRegionName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleEditRegion(r.id); if (e.key === "Escape") setEditingRegionId(null); }}
                            autoFocus
                          />
                          <button onClick={() => handleEditRegion(r.id)} className="p-1.5 text-primary transition-colors"><Check size={15} /></button>
                          <button onClick={() => setEditingRegionId(null)} className="p-1.5 text-muted-foreground transition-colors"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col -my-1">
                            <button onClick={() => moveRegion(regions.indexOf(r), -1)} disabled={idx === 0} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ArrowUp size={14} /></button>
                            <button onClick={() => moveRegion(regions.indexOf(r), 1)} disabled={idx === broadRegions.length - 1} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ArrowDown size={14} /></button>
                          </div>
                          <span className="flex-1 text-sm">{r.name}</span>
                          <button onClick={() => { setEditingRegionId(r.id); setEditingRegionName(r.name); }} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => handleDeleteRegion(r.id, r.name)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  ))}
                  {addingRegion && (
                    <div className="flex items-center gap-2 py-1">
                      <input
                        className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                        placeholder="中地域タグ名"
                        value={newRegionName}
                        onChange={(e) => setNewRegionName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddRegion(); if (e.key === "Escape") setAddingRegion(false); }}
                        autoFocus
                      />
                      <button onClick={handleAddRegion} className="p-1.5 text-primary transition-colors"><Check size={15} /></button>
                      <button onClick={() => setAddingRegion(false)} className="p-1.5 text-muted-foreground transition-colors"><X size={15} /></button>
                    </div>
                  )}
                  {broadRegions.length === 0 && !addingRegion && (
                    <p className="text-sm text-muted-foreground">+ボタンで中地域タグを追加できます</p>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        {/* 小地域タグ管理（50音順・並び替えなし） */}
        {(() => {
          const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
            .sort((a, b) => a.name.localeCompare(b.name, "ja"));
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-1 flex-1 text-left"
                  onClick={() => setSpecificRegionSectionOpen((v) => !v)}
                >
                  <h2 className="font-semibold flex-1">小地域タグ管理</h2>
                  {specificRegionSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
              </div>
              {specificRegionSectionOpen && (
                <div className="flex flex-col gap-2">
                  {specificRegions.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 py-1">
                      {editingRegionId === r.id ? (
                        <>
                          <input
                            className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                            value={editingRegionName}
                            onChange={(e) => setEditingRegionName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleEditRegion(r.id); if (e.key === "Escape") setEditingRegionId(null); }}
                            autoFocus
                          />
                          <button onClick={() => handleEditRegion(r.id)} className="p-1.5 text-primary transition-colors"><Check size={15} /></button>
                          <button onClick={() => setEditingRegionId(null)} className="p-1.5 text-muted-foreground transition-colors"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{r.name}</span>
                          <button onClick={() => { setEditingRegionId(r.id); setEditingRegionName(r.name); }} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => handleDeleteRegion(r.id, r.name)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  ))}
                  {specificRegions.length === 0 && (
                    <p className="text-sm text-muted-foreground">CSVインポート時に自動生成されます</p>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        {/* 地域タグ未設定アイテム */}
        {(() => {
          const regionlessWishes = wishes.filter((w) => w.regions.length === 0 && w.status !== "DONE");
          const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
          const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
            .sort((a, b) => a.name.localeCompare(b.name, "ja"));
          if (regions.length === 0) return null;
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <button
                type="button"
                className="flex items-center gap-1 text-left"
                onClick={() => setRegionlessSectionOpen((v) => !v)}
              >
                <div className="flex-1">
                  <h2 className="font-semibold">地域タグ未設定</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {regionlessWishes.length > 0 ? `${regionlessWishes.length}件未設定` : "全件設定済み"}
                  </p>
                </div>
                {regionlessSectionOpen ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
              </button>
              {regionlessSectionOpen && (
                <div className="flex flex-col gap-2">
                  {regionlessWishes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">地域タグ未設定のアイテムはありません</p>
                  ) : regionlessWishes.map((w) => {
                    const expanded = regionlessExpandedId === w.id;
                    const currentRegionIds = w.regions.map((r) => r.id);
                    return (
                      <div key={w.id} className="border border-border rounded-xl overflow-hidden">
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                          onClick={() => setRegionlessExpandedId(expanded ? null : w.id)}
                        >
                          <span className="flex-1 text-sm truncate">{w.title}</span>
                          {expanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                        </button>
                        {expanded && (
                          <div className="px-3 pb-3 flex flex-col gap-3 border-t border-border">
                            {broadRegions.length > 0 && (
                              <div className="flex flex-col gap-1.5 pt-2">
                                <p className="text-xs text-muted-foreground font-medium">中地域</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {broadRegions.map((r) => {
                                    const selected = currentRegionIds.includes(r.id);
                                    return (
                                      <button
                                        key={r.id}
                                        type="button"
                                        disabled={savingRegionWishId === w.id}
                                        onClick={async () => {
                                          const next = selected
                                            ? currentRegionIds.filter((id) => id !== r.id)
                                            : [...currentRegionIds, r.id];
                                          setSavingRegionWishId(w.id);
                                          try { await updateWish(w.id, { regionIds: next }); } catch { toast.error("更新に失敗しました"); }
                                          finally { setSavingRegionWishId(null); }
                                        }}
                                        className={cn(
                                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}
                                      >
                                        {r.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {specificRegions.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                <p className="text-xs text-muted-foreground font-medium">小地域</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {specificRegions.map((r) => {
                                    const selected = currentRegionIds.includes(r.id);
                                    return (
                                      <button
                                        key={r.id}
                                        type="button"
                                        disabled={savingRegionWishId === w.id}
                                        onClick={async () => {
                                          const next = selected
                                            ? currentRegionIds.filter((id) => id !== r.id)
                                            : [...currentRegionIds, r.id];
                                          setSavingRegionWishId(w.id);
                                          try { await updateWish(w.id, { regionIds: next }); } catch { toast.error("更新に失敗しました"); }
                                          finally { setSavingRegionWishId(null); }
                                        }}
                                        className={cn(
                                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        )}
                                      >
                                        {r.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">CSV取り込み履歴</h2>
            <button
              onClick={() => { setLogsOpen((v) => !v); if (!logsOpen) fetchLogs(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {logsOpen ? "閉じる" : "開く"}
            </button>
          </div>
          {logsOpen && (
            <>
              {logsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : logsError ? (
                <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <p className="font-medium">履歴の取得に失敗しました</p>
                  <p className="mt-0.5 opacity-80">{logsError}</p>
                  <p className="mt-1 opacity-70">Supabase の SQL Editor でマイグレーション (002_csv_import_logs.sql) を実行してください</p>
                </div>
              ) : importLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">履歴がありません</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {importLogs.map((log) => {
                    const member = group?.members.find((m) => m.id === log.memberId);
                    const date = new Date(log.importedAt);
                    const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div key={log.id} className="rounded-xl border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="w-full flex items-start justify-between gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs text-muted-foreground">{dateStr}　{member?.nickname ?? "不明"}</span>
                            <span className="text-xs truncate text-foreground">{log.fileNames.join("、")}</span>
                            <span className="text-xs text-muted-foreground">
                              新規 {log.inserted}　更新 {log.updated}　スキップ {log.skipped}
                            </span>
                          </div>
                          {(log.insertedItems.length > 0 || log.updatedItems.length > 0 || log.skippedItems.length > 0) && (
                            isExpanded ? <ChevronUp size={14} className="shrink-0 mt-1 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 mt-1 text-muted-foreground" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border max-h-64 overflow-y-auto overflow-x-hidden">
                            {log.insertedItems.length > 0 && (
                              <>
                                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50 sticky top-0 bg-card">新規 {log.inserted}件</p>
                                {log.insertedItems.map((item, i) => (
                                  <div key={i} className="px-3 py-1.5 border-b border-border/30 last:border-0">
                                    <span className="text-xs truncate block">{item.title}</span>
                                  </div>
                                ))}
                              </>
                            )}
                            {log.updatedItems.length > 0 && (
                              <>
                                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50 sticky top-0 bg-card">更新 {log.updated}件</p>
                                {log.updatedItems.map((item, i) => (
                                  <div key={i} className="px-3 py-1.5 border-b border-border/30 last:border-0">
                                    <span className="text-xs truncate block">{item.title}</span>
                                  </div>
                                ))}
                              </>
                            )}
                            {log.skippedItems.length > 0 && (
                              <>
                                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border/50 sticky top-0 bg-card">スキップ {log.skipped}件</p>
                                {log.skippedItems.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/30 last:border-0">
                                    <span className="text-xs truncate flex-1">{item.title}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {item.reason === "no_change" ? "変更なし" : "重複"}
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">ごみ箱</h2>
            <button
              onClick={() => { setTrashOpen((v) => !v); if (!trashOpen) fetchTrash(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {trashOpen ? "閉じる" : "開く"}
            </button>
          </div>
          {trashOpen && (
            <>
              <p className="text-xs text-muted-foreground">削除後30日間保持されます</p>
              {trashLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                </div>
              ) : trashItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">ごみ箱は空です</p>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    {trashItems.map((item) => {
                      const deletedAt = new Date(item.deletedAt);
                      const daysLeft = 30 - Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-b-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground">残り{daysLeft}日</p>
                          </div>
                          <button
                            onClick={async () => { try { await restoreWish(item.id); toast.success("復元しました"); } catch { toast.error("復元に失敗しました"); } }}
                            className="text-xs text-primary hover:underline shrink-0"
                          >
                            復元
                          </button>
                          <button
                            onClick={async () => { if (!confirm("完全に削除しますか？")) return; try { await permanentDelete(item.id); toast.success("削除しました"); } catch { toast.error("削除に失敗しました"); } }}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => { if (!confirm("ごみ箱を空にしますか？元に戻せません。")) return; try { await emptyTrash(); toast.success("ごみ箱を空にしました"); } catch { toast.error("失敗しました"); } }}
                    className="w-full"
                  >
                    ごみ箱を空にする
                  </Button>
                </>
              )}
            </>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-muted-foreground" />
            <h2 className="font-semibold text-muted-foreground">開発者向け</h2>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dev-mode">ルーレット確率を表示</Label>
            <Switch id="dev-mode" checked={devMode} onCheckedChange={setDevMode} />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/group/${uuid}?mode=delete`)}
          >
            タスクを選んで削除
          </Button>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">使い方</h2>
          <Button variant="outline" className="w-full" onClick={() => router.push(`/group/${uuid}/help`)}>
            使い方ガイドを見る
          </Button>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">共有</h2>
          <p className="text-sm text-muted-foreground">
            このURLをメンバーに送ってグループに招待しよう
          </p>
          <Button
            variant="outline"
            onClick={handleCopyUrl}
            className={cn("w-full gap-2", copied && "text-green-600 border-green-600")}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "コピーしました" : "招待URLをコピー"}
          </Button>
        </section>
      </div>

      <BottomNav groupId={uuid} />
    </div>
  );
}
