"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGroup } from "@/hooks/useGroup";
import { useGenres } from "@/hooks/useGenres";
import { useRegions } from "@/hooks/useRegions";
import { isBroadRegionTag, specificRegionSortKey, specificRegionColorClasses, toBroadRegionTag, toSpecificRegionTag, BROAD_TAG_NAMES } from "@/lib/utils/regionTag";
import { useTrash } from "@/hooks/useTrash";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { useCsvImportLogs } from "@/hooks/useCsvImportLogs";
import { useCsvImport } from "@/hooks/useCsvImport";
import { Code2 } from "lucide-react";
import { useWishes } from "@/hooks/useWishes";
import { useGroupStore } from "@/lib/store/groupStore";
import { getDarkMode, setDarkMode, getGroupMember, saveGroupMember, getDefaultExcludeGenreIds, saveDefaultExcludeGenreIds, getDefaultExcludeRegionIds, saveDefaultExcludeRegionIds, SmallGenreSubGroups } from "@/lib/utils/localStorage";
import { useFilterStore } from "@/lib/store/filterStore";
import { RouletteSettings, Wish, GenreType, GENRE_TYPE_LABELS } from "@/types";
import { Copy, Check, Download, Upload, Trash2, Pencil, Plus, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, MapPin, GitMerge } from "lucide-react";
import { CsvGenreAssignDialog } from "@/components/settings/CsvGenreAssignDialog";
import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export default function SettingsPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const { fetchRouletteSettings, saveRouletteSettings } = useGroup();
  const { settings, setSettings, devMode, setDevMode } = useRouletteStore();
  const { wishes, wishesRef, createWish, updateWish, deleteWish, refetch: refetchWishes } = useWishes(uuid, { statuses: ["PENDING", "HOLD", "DONE"], includeVotes: false, skip: true });
  const { group, setGroup, setCurrentMember, setLastExportedAt } = useGroupStore();
  const currentMemberId = getGroupMember(uuid)?.memberId;
  const [darkMode, setDarkModeState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fullImporting, setFullImporting] = useState(false);
  const [wishCount, setWishCount] = useState<number | null>(null);
  const [regionlessCount, setRegionlessCount] = useState<number | null>(null);
  const [locationlessCount, setLocationlessCount] = useState<number | null>(null);
  const [wishesLoaded, setWishesLoaded] = useState(false);
  const [wishesLoadingLocal, setWishesLoadingLocal] = useState(false);
  const wishesLoadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullFileInputRef = useRef<HTMLInputElement>(null);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [switchingUser, setSwitchingUser] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const { genres, loading: genresLoading, createGenre, updateGenre, deleteGenre, reorderGenres } = useGenres(uuid);
  const { regions, loading: regionsLoading, createRegion, updateRegion, deleteRegion, reorderRegions } = useRegions(uuid);
  const { items: trashItems, loading: trashLoading, fetchTrash, restoreWish, permanentDelete, emptyTrash } = useTrash(uuid);
  const { logs: importLogs, loading: logsLoading, error: logsError, fetchLogs } = useCsvImportLogs(uuid);
  const { retryLocationEnrichment } = useCsvImport(uuid);
  const [trashOpen, setTrashOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null);
  const [editingGenreName, setEditingGenreName] = useState("");
  const [editingGenreType, setEditingGenreType] = useState<GenreType>('MEDIUM');
  const [addingGenreType, setAddingGenreType] = useState<GenreType | null>(null);
  const [newGenreName, setNewGenreName] = useState("");
  const [retryingLocation, setRetryingLocation] = useState(false);
  const [genreLargeSectionOpen, setGenreLargeSectionOpen] = useState(false);
  const [genreMediumSectionOpen, setGenreMediumSectionOpen] = useState(false);
  const [genreSmallSectionOpen, setGenreSmallSectionOpen] = useState(false);
  const { smallGenreSubGroups, setSmallGenreSubGroups: setSmallGenreSubGroupsStore } = useGroupStore();
  const setSmallGenreSubGroupsState = useCallback(async (next: SmallGenreSubGroups) => {
    setSmallGenreSubGroupsStore(next);
    const supabase = createClient();
    await supabase.from("groups").update({ small_genre_subgroups: next }).eq("id", uuid);
  }, [uuid, setSmallGenreSubGroupsStore]);
  const [editingSubGroupName, setEditingSubGroupName] = useState<1 | 2 | null>(null);
  const [subGroupNameInput, setSubGroupNameInput] = useState("");
  const subGroupNameComposing = useRef(false);
  const [broadRegionSectionOpen, setBroadRegionSectionOpen] = useState(false);
  const [specificRegionSectionOpen, setSpecificRegionSectionOpen] = useState(false);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState("");
  const [addingBroadRegion, setAddingBroadRegion] = useState(false);
  const [newBroadRegionName, setNewBroadRegionName] = useState("");
  const [addingSpecificRegion, setAddingSpecificRegion] = useState(false);
  const [newSpecificRegionName, setNewSpecificRegionName] = useState("");
  const [defaultExcludeIds, setDefaultExcludeIds] = useState<string[]>(() => getDefaultExcludeGenreIds(uuid ?? ""));
  const [defaultExcludeRegionIds, setDefaultExcludeRegionIdsState] = useState<string[]>(() => getDefaultExcludeRegionIds(uuid ?? ""));
  const [defaultExcludeGenreSectionOpen, setDefaultExcludeGenreSectionOpen] = useState(false);
  const [defaultExcludeRegionSectionOpen, setDefaultExcludeRegionSectionOpen] = useState(false);
  const [regionlessSectionOpen, setRegionlessSectionOpen] = useState(false);
  const [regionlessExpandedId, setRegionlessExpandedId] = useState<string | null>(null);
  const [savingRegionWishId, setSavingRegionWishId] = useState<string | null>(null);
  const [locationlessSectionOpen, setLocationlessSectionOpen] = useState(false);
  const [locationlessExpandedId, setLocationlessExpandedId] = useState<string | null>(null);
  const [locationInputs, setLocationInputs] = useState<Record<string, { lat: string; lng: string }>>({});
  const [savingLocationWishId, setSavingLocationWishId] = useState<string | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeWishes, setMergeWishes] = useState(true);
  const [mergeRegionTags, setMergeRegionTags] = useState(true);
  const [merging, setMerging] = useState(false);
  const [retryLocationDialogOpen, setRetryLocationDialogOpen] = useState(false);
  const [checkingMismatch, setCheckingMismatch] = useState(false);
  interface MismatchItem {
    id: string; title: string; latitude: number; longitude: number;
    memoUrl: string | null; currentRegions: string[];
    geocodedBroad: string | null; geocodedSpecific: string | null;
  }
  const [mismatchItems, setMismatchItems] = useState<MismatchItem[]>([]);
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);
  const [fixingMismatchId, setFixingMismatchId] = useState<string | null>(null);
  const [mismatchManualInputs, setMismatchManualInputs] = useState<Record<string, { lat: string; lng: string }>>({});
  const [savingMismatchId, setSavingMismatchId] = useState<string | null>(null);
  const [mismatchRegionSelections, setMismatchRegionSelections] = useState<Record<string, string[]>>({});
  const [dismissingMismatchId, setDismissingMismatchId] = useState<string | null>(null);
  const [csvGenreAssignOpen, setCsvGenreAssignOpen] = useState(false);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    // wishesの件数だけ軽量クエリで取得
    const supabase = createClient();
    supabase
      .from("wishes")
      .select("id", { count: "exact", head: true })
      .eq("group_id", uuid)
      .is("deleted_at", null)
      .then(({ count }) => setWishCount(count ?? 0));

    // 緯度経度未設定の件数（軽量クエリ）
    supabase
      .from("wishes")
      .select("id", { count: "exact", head: true })
      .eq("group_id", uuid)
      .is("deleted_at", null)
      .or("latitude.is.null,longitude.is.null")
      .then(({ count }) => setLocationlessCount(count ?? 0));

    // 地域タグ未設定の件数（IDと地域名のみ取得してクライアントで分類）
    (async () => {
      type WishWithRegions = { id: string; wish_regions: Array<{ region: { name: string } | null }> };
      let allData: WishWithRegions[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("wishes")
          .select("id, wish_regions(region:regions(name))")
          .eq("group_id", uuid)
          .is("deleted_at", null)
          .order("id")
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        allData = allData.concat(data as unknown as WishWithRegions[]);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      const count = allData.filter((w) => {
        const names = (w.wish_regions ?? [])
          .map((wr) => wr.region?.name)
          .filter((n): n is string => Boolean(n));
        const hasBroad = names.some((n) => isBroadRegionTag(n));
        const hasSpecific = names.some((n) => !isBroadRegionTag(n));
        return !hasBroad || !hasSpecific;
      }).length;
      setRegionlessCount(count);
    })();
  }, [uuid, fetchRouletteSettings, setSettings]);

  const ensureWishesLoaded = useCallback(async () => {
    if (wishesLoaded || wishesLoadingRef.current) return;
    wishesLoadingRef.current = true;
    setWishesLoadingLocal(true);
    await refetchWishes();
    setWishesLoaded(true);
    setWishesLoadingLocal(false);
    wishesLoadingRef.current = false;
  }, [wishesLoaded, refetchWishes]);

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

  const handleExport = async () => {
    await ensureWishesLoaded();
    const data = wishesRef.current.map((w) => ({
      title: w.title,
      situation: w.situation,
      status: w.status,
      memo: w.memo ?? null,
      budget: w.budget ?? null,
      duration: w.duration ?? null,
      seasons: w.seasons,
      genres: w.genres.map((g) => ({ name: g.name, genreType: g.genreType })),
      regions: w.regions.map((r) => r.name),
      isFavorite: w.isFavorite,
      doneAt: w.doneAt,
      latitude: w.latitude ?? null,
      longitude: w.longitude ?? null,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yaritai_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    const supabase = createClient();
    await supabase.from("groups").update({ last_exported_at: now }).eq("id", uuid);
    setLastExportedAt(now);
    toast.success("エクスポートしました");
  };

  const handleFullExport = async () => {
    await ensureWishesLoaded();
    try {
      const supabase = createClient();

      const { data: presetRows } = await supabase
        .from("csv_genre_file_presets")
        .select("file_name, large_genre_id, medium_genre_id")
        .eq("group_id", uuid);

      const genreIdToName = new Map(genres.map((g) => [g.id, g.name]));

      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        groupName: group?.name ?? "",
        considerLevel: settings.considerLevel,
        smallGenreSubGroups: smallGenreSubGroups ?? {},
        genres: genres.map((g, i) => ({ name: g.name, genreType: g.genreType, sortOrder: i })),
        regions: regions.map((r) => ({ name: r.name })),
        csvGenreFilePresets: (presetRows ?? []).map((p) => ({
          fileName: (p as { file_name: string; large_genre_id: string | null; medium_genre_id: string | null }).file_name,
          largeGenreName: (p as { large_genre_id: string | null }).large_genre_id ? genreIdToName.get((p as { large_genre_id: string }).large_genre_id) ?? null : null,
          mediumGenreName: (p as { medium_genre_id: string | null }).medium_genre_id ? genreIdToName.get((p as { medium_genre_id: string }).medium_genre_id) ?? null : null,
        })),
        wishes: wishesRef.current.map((w) => ({
          title: w.title,
          situation: w.situation,
          status: w.status,
          memo: w.memo ?? null,
          budget: w.budget ?? null,
          duration: w.duration ?? null,
          seasons: w.seasons,
          genres: w.genres.map((g) => ({ name: g.name, genreType: g.genreType })),
          regions: w.regions.map((r) => r.name),
          isFavorite: w.isFavorite,
          doneAt: w.doneAt,
          latitude: w.latitude ?? null,
          longitude: w.longitude ?? null,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yaritai_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      await supabase.from("groups").update({ last_exported_at: now }).eq("id", uuid);
      setLastExportedAt(now);
      toast.success("フルバックアップをエクスポートしました");
    } catch {
      toast.error("エクスポートに失敗しました");
    }
  };

  const handleFullImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("現在のデータに上書き・追加します。よろしいですか？")) {
      if (fullFileInputRef.current) fullFileInputRef.current.value = "";
      return;
    }
    setFullImporting(true);
    await ensureWishesLoaded();
    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        version: number;
        groupName?: string;
        considerLevel?: number;
        smallGenreSubGroups?: SmallGenreSubGroups;
        genres?: { name: string; genreType: string; sortOrder: number }[];
        regions?: { name: string }[];
        csvGenreFilePresets?: { fileName: string; largeGenreName: string | null; mediumGenreName: string | null }[];
        wishes?: ImportItem[];
      };
      if (!data || typeof data !== "object" || data.version !== 1) throw new Error("不正なフォーマットです");

      const supabase = createClient();
      const genreCache = new Map(genres.map((g) => [g.name, g.id]));
      const regionCache = new Map(regions.map((r) => [r.name, r.id]));

      // グループ名
      if (data.groupName && typeof data.groupName === "string" && group) {
        await supabase.from("groups").update({ name: data.groupName }).eq("id", uuid);
        setGroup({ ...group, name: data.groupName });
      }

      // 忖度レベル
      if (typeof data.considerLevel === "number") {
        await saveRouletteSettings(uuid, { considerLevel: data.considerLevel });
        setSettings({ considerLevel: data.considerLevel });
      }

      // 小ジャンルサブグループ
      if (data.smallGenreSubGroups && typeof data.smallGenreSubGroups === "object") {
        await setSmallGenreSubGroupsState(data.smallGenreSubGroups as SmallGenreSubGroups);
      }

      // ジャンル（不足分を追加）
      if (Array.isArray(data.genres)) {
        for (const g of data.genres) {
          if (!genreCache.has(g.name)) {
            const { data: created } = await supabase
              .from("genres")
              .insert({ group_id: uuid, name: g.name, genre_type: g.genreType, sort_order: g.sortOrder })
              .select("id")
              .single();
            if (created) genreCache.set(g.name, (created as { id: string }).id);
          }
        }
      }

      // 地域（不足分を追加）
      if (Array.isArray(data.regions)) {
        for (const r of data.regions) {
          if (!regionCache.has(r.name)) {
            const { data: created } = await supabase
              .from("regions")
              .insert({ group_id: uuid, name: r.name })
              .select("id")
              .single();
            if (created) regionCache.set(r.name, (created as { id: string }).id);
          }
        }
      }

      // CSVジャンルプリセット（upsert）
      if (Array.isArray(data.csvGenreFilePresets)) {
        for (const p of data.csvGenreFilePresets) {
          const largeGenreId = p.largeGenreName ? (genreCache.get(p.largeGenreName) ?? null) : null;
          const mediumGenreId = p.mediumGenreName ? (genreCache.get(p.mediumGenreName) ?? null) : null;
          await supabase.from("csv_genre_file_presets").upsert({
            group_id: uuid,
            file_name: p.fileName,
            large_genre_id: largeGenreId,
            medium_genre_id: mediumGenreId,
          }, { onConflict: "group_id,file_name" });
        }
      }

      // タスク（重複スキップ）
      let imported = 0;
      let skipped = 0;
      if (Array.isArray(data.wishes)) {
        const resolveGenreIds = async (items: ExportGenre[]) => {
          const ids: string[] = [];
          for (const item of items) {
            const name = typeof item === "string" ? item : item.name;
            const genreType = typeof item === "string" ? "MEDIUM" : (item.genreType ?? "MEDIUM");
            if (genreCache.has(name)) {
              ids.push(genreCache.get(name)!);
            } else {
              const { data: created } = await supabase
                .from("genres")
                .insert({ group_id: uuid, name, genre_type: genreType })
                .select("id")
                .single();
              if (created) { genreCache.set(name, (created as { id: string }).id); ids.push((created as { id: string }).id); }
            }
          }
          return ids;
        };
        const resolveRegionIds = async (names: string[]) => {
          const ids: string[] = [];
          for (const name of names) {
            if (regionCache.has(name)) {
              ids.push(regionCache.get(name)!);
            } else {
              const { data: created } = await supabase.from("regions").insert({ group_id: uuid, name }).select("id").single();
              if (created) { regionCache.set(name, (created as { id: string }).id); ids.push((created as { id: string }).id); }
            }
          }
          return ids;
        };

        for (const item of data.wishes) {
          if (!item.title) continue;
          const isDuplicate = wishesRef.current.some(
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

          const genreIds = await resolveGenreIds(item.genres ?? []);
          const regionIds = await resolveRegionIds(item.regions ?? []);
          const created = await createWish({
            title: item.title,
            situation: item.situation ?? "HOME",
            status: item.status ?? "PENDING",
            memo: item.memo,
            budget: item.budget,
            duration: item.duration,
            seasons: item.seasons ?? [],
            genreIds,
            regionIds,
          });
          const extra: Record<string, unknown> = {};
          if (item.doneAt) extra.done_at = item.doneAt;
          if (item.latitude != null) extra.latitude = item.latitude;
          if (item.longitude != null) extra.longitude = item.longitude;
          if (item.isFavorite) extra.is_favorite = item.isFavorite;
          if (Object.keys(extra).length > 0) {
            await supabase.from("wishes").update(extra).eq("id", (created as { id: string }).id);
          }
          imported++;
        }
      }

      const parts: string[] = [];
      if (imported > 0) parts.push(`タスク${imported}件をインポート`);
      if (skipped > 0) parts.push(`重複${skipped}件スキップ`);
      toast.success(parts.length > 0 ? parts.join("、") : "フルバックアップを復元しました");
    } catch {
      toast.error("インポートに失敗しました");
    } finally {
      setFullImporting(false);
      if (fullFileInputRef.current) fullFileInputRef.current.value = "";
    }
  };

  type ExportGenre = { name: string; genreType: string } | string;
  type ImportItem = {
    title?: string;
    situation?: Wish["situation"];
    status?: Wish["status"];
    memo?: string;
    budget?: Wish["budget"];
    duration?: Wish["duration"];
    seasons?: Wish["seasons"];
    genres?: ExportGenre[];
    regions?: string[];
    isFavorite?: boolean;
    doneAt?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    await ensureWishesLoaded();
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ImportItem[];
      if (!Array.isArray(data)) throw new Error("不正なフォーマットです");

      const supabase = createClient();
      // ジャンル名→IDキャッシュ（インポート中に作成したものも追記）
      const genreCache = new Map(genres.map((g) => [g.name, g.id]));
      const regionCache = new Map(regions.map((r) => [r.name, r.id]));

      const resolveGenreIds = async (items: ExportGenre[]) => {
        const ids: string[] = [];
        for (const item of items) {
          const name = typeof item === "string" ? item : item.name;
          const genreType = typeof item === "string" ? "MEDIUM" : (item.genreType ?? "MEDIUM");
          if (genreCache.has(name)) {
            ids.push(genreCache.get(name)!);
          } else {
            const { data: created } = await supabase
              .from("genres")
              .insert({ group_id: uuid, name, genre_type: genreType })
              .select("id")
              .single();
            if (created) { genreCache.set(name, created.id as string); ids.push(created.id as string); }
          }
        }
        return ids;
      };

      const resolveRegionIds = async (names: string[]) => {
        const ids: string[] = [];
        for (const name of names) {
          if (regionCache.has(name)) {
            ids.push(regionCache.get(name)!);
          } else {
            const { data: created } = await supabase.from("regions").insert({ group_id: uuid, name }).select("id").single();
            if (created) { regionCache.set(name, created.id as string); ids.push(created.id as string); }
          }
        }
        return ids;
      };

      let imported = 0;
      let skipped = 0;
      for (const item of data) {
        if (!item.title) continue;
        const isDuplicate = wishesRef.current.some(
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

        const genreIds = await resolveGenreIds(item.genres ?? []);
        const regionIds = await resolveRegionIds(item.regions ?? []);

        const created = await createWish({
          title: item.title,
          situation: item.situation ?? "HOME",
          status: item.status ?? "PENDING",
          memo: item.memo,
          budget: item.budget,
          duration: item.duration,
          seasons: item.seasons ?? [],
          genreIds,
          regionIds,
        });

        // createWish でカバーされない項目を補完
        const extra: Record<string, unknown> = {};
        if (item.doneAt) extra.done_at = item.doneAt;
        if (item.latitude != null) extra.latitude = item.latitude;
        if (item.longitude != null) extra.longitude = item.longitude;
        if (item.isFavorite) extra.is_favorite = item.isFavorite;
        if (Object.keys(extra).length > 0) {
          await supabase.from("wishes").update(extra).eq("id", (created as { id: string }).id);
        }

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
    setEditingGroupName(false);
    toast.success("グループ名を更新しました");
  };

  const moveGenre = async (genreType: GenreType, index: number, dir: -1 | 1) => {
    const typeGenres = genres.filter((g) => g.genreType === genreType);
    const next = [...typeGenres];
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

  const saveRegionTags = async (wishId: string, regionIds: string[]) => {
    if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    setSavingRegionWishId(wishId);
    savingTimerRef.current = setTimeout(() => setSavingRegionWishId(null), 8000);
    try {
      await updateWish(wishId, { regionIds });
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
      setSavingRegionWishId(null);
    }
  };

  const saveLocation = async (wishId: string, lat: number, lng: number) => {
    setSavingLocationWishId(wishId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("wishes").update({ latitude: lat, longitude: lng }).eq("id", wishId);
      if (error) throw error;
      await refetchWishes();
      toast.success("位置情報を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSavingLocationWishId(null);
    }
  };

  const handleMergeDuplicates = async (opts: { wishes: boolean; regionTags: boolean }) => {
    setMergeDialogOpen(false);
    setMerging(true);
    let mergedWishes = 0;
    let mergedRegions = 0;

    const extractMemoUrl = (memo: string | undefined | null): string | null => {
      if (!memo) return null;
      const lines = memo.split("\n");
      const last = lines[lines.length - 1].trim();
      return /^https?:\/\//.test(last) ? last : null;
    };

    if (opts.wishes) {
      const uniqueWishes = wishes.filter((w, i) => wishes.findIndex((x) => x.id === w.id) === i);
      const titleGroups = new Map<string, typeof wishes>();
      for (const w of uniqueWishes) {
        const group = titleGroups.get(w.title) ?? [];
        group.push(w);
        titleGroups.set(w.title, group);
      }
      for (const group of titleGroups.values()) {
        if (group.length < 2) continue;
        const [primary, ...rest] = group;
        const primaryUrl = extractMemoUrl(primary.memo);
        const toMerge = rest.filter((w) => {
          const url = extractMemoUrl(w.memo);
          return !(primaryUrl && url && primaryUrl !== url);
        });
        if (toMerge.length === 0) continue;
        const allMemoLines = [primary, ...toMerge]
          .map((w) => w.memo).filter(Boolean)
          .flatMap((m) => m!.split("\n").filter(Boolean));
        const mergedMemo = [...new Set(allMemoLines)].join("\n") || undefined;
        const allGenreIds = [...new Set([primary, ...toMerge].flatMap((w) => w.genres.map((g) => g.id)))];
        const allRegionIds = [...new Set([primary, ...toMerge].flatMap((w) => w.regions.map((r) => r.id)))];
        const mergedSeasons = [...new Set([primary, ...toMerge].flatMap((w) => w.seasons))];
        try {
          await updateWish(primary.id, { memo: mergedMemo, genreIds: allGenreIds, regionIds: allRegionIds, seasons: mergedSeasons });
          for (const dup of toMerge) { await deleteWish(dup.id); }
          mergedWishes += toMerge.length;
        } catch {
          toast.error(`「${primary.title}」の統合に失敗しました`);
        }
      }
    }

    if (opts.regionTags) {
    const supabase = createClient();

    const mergeRegionGroup = async (group: typeof regions) => {
      if (group.length < 2) return;
      const [keep, ...dups] = group;
      for (const dup of dups) {
        const affected = wishes.filter((w) => w.regions.some((r) => r.id === dup.id));
        for (const w of affected) {
          const newIds = [
            ...w.regions.map((r) => r.id).filter((id) => id !== dup.id),
            ...(w.regions.some((r) => r.id === keep.id) ? [] : [keep.id]),
          ];
          await updateWish(w.id, { regionIds: newIds });
        }
        const { error: wrErr } = await supabase.from("wish_regions").delete().eq("region_id", dup.id);
        if (wrErr) { toast.error(`wish_regions削除失敗: ${wrErr.message}`); return; }
        try { await deleteRegion(dup.id); mergedRegions++; }
        catch (e) { toast.error(`地域タグ「${dup.name}」削除失敗: ${e instanceof Error ? e.message : String(e)}`); }
      }
    };

    const broadRegs = regions.filter((r) => isBroadRegionTag(r.name));
    const broadNameGroups = new Map<string, typeof regions>();
    for (const r of broadRegs) {
      const key = r.name.trim().normalize("NFC");
      const group = broadNameGroups.get(key) ?? [];
      group.push(r);
      broadNameGroups.set(key, group);
    }
    for (const group of broadNameGroups.values()) { await mergeRegionGroup(group); }

    const specificRegs = regions.filter((r) => !isBroadRegionTag(r.name));
    const regionNameGroups = new Map<string, typeof regions>();
    for (const r of specificRegs) {
      const key = r.name.trim().normalize("NFC");
      const group = regionNameGroups.get(key) ?? [];
      group.push(r);
      regionNameGroups.set(key, group);
    }
    for (const group of regionNameGroups.values()) { await mergeRegionGroup(group); }
    } // opts.regionTags

    setMerging(false);
    if (mergedWishes > 0 || mergedRegions > 0) {
      toast.success(`統合完了: スポット${mergedWishes}件、地域タグ${mergedRegions}件`);
    } else {
      toast.success("重複は見つかりませんでした");
    }
  };

  const handleAddBroadRegion = async () => {
    if (!newBroadRegionName.trim()) return;
    try {
      await createRegion(newBroadRegionName.trim());
      setAddingBroadRegion(false);
      setNewBroadRegionName("");
      toast.success("地域タグを追加しました");
    } catch {
      toast.error("追加に失敗しました");
    }
  };

  const handleAddSpecificRegion = async () => {
    if (!newSpecificRegionName.trim()) return;
    try {
      await createRegion(newSpecificRegionName.trim());
      setAddingSpecificRegion(false);
      setNewSpecificRegionName("");
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
    if (!newGenreName.trim() || !addingGenreType) return;
    try {
      await createGenre(newGenreName.trim(), addingGenreType);
      setAddingGenreType(null);
      setNewGenreName("");
      toast.success("ジャンルを追加しました");
    } catch {
      toast.error("追加に失敗しました");
    }
  };

  const handleEditGenre = async (id: string) => {
    if (!editingGenreName.trim()) return;
    try {
      await updateGenre(id, { name: editingGenreName.trim(), genreType: editingGenreType });
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

  const handleCheckRegionMismatch = async () => {
    // API通信なし・座標ベースチェック
    // 中地域タグ・小地域タグと lat/lng の矩形範囲を比較して不一致を検出する
    type Box = { latMin: number; latMax: number; lngMin: number; lngMax: number };
    const BOUNDS: Record<string, Box> = {
      "東京23区":  { latMin: 35.53, latMax: 35.82, lngMin: 139.56, lngMax: 139.92 },
      "東京市部":  { latMin: 35.51, latMax: 35.90, lngMin: 138.94, lngMax: 139.63 },
      "神奈川":    { latMin: 35.10, latMax: 35.68, lngMin: 138.93, lngMax: 139.78 },
      "千葉":      { latMin: 34.90, latMax: 36.00, lngMin: 139.73, lngMax: 140.95 },
      "埼玉":      { latMin: 35.74, latMax: 36.30, lngMin: 138.72, lngMax: 139.93 },
      "茨城":      { latMin: 35.72, latMax: 36.80, lngMin: 139.69, lngMax: 140.86 },
    };
    // 関東圏全体（「旅行先」タグの逆チェック用）
    const KANTO: Box = { latMin: 34.88, latMax: 36.85, lngMin: 138.70, lngMax: 141.00 };

    // 小地域タグの都道府県名チェック用バウンディングボックス（47都道府県）
    const PREF_BOUNDS: Record<string, Box> = {
      "北海道":   { latMin: 41.30, latMax: 45.60, lngMin: 139.30, lngMax: 145.90 },
      "青森県":   { latMin: 40.20, latMax: 41.60, lngMin: 139.70, lngMax: 141.70 },
      "岩手県":   { latMin: 38.70, latMax: 40.50, lngMin: 140.60, lngMax: 142.10 },
      "宮城県":   { latMin: 37.80, latMax: 39.00, lngMin: 140.30, lngMax: 141.70 },
      "秋田県":   { latMin: 38.90, latMax: 40.60, lngMin: 139.70, lngMax: 141.00 },
      "山形県":   { latMin: 37.70, latMax: 39.00, lngMin: 139.40, lngMax: 140.80 },
      "福島県":   { latMin: 36.80, latMax: 37.90, lngMin: 139.20, lngMax: 141.10 },
      "茨城県":   { latMin: 35.72, latMax: 36.80, lngMin: 139.69, lngMax: 140.86 },
      "栃木県":   { latMin: 36.20, latMax: 37.20, lngMin: 139.30, lngMax: 140.40 },
      "群馬県":   { latMin: 36.10, latMax: 37.00, lngMin: 138.40, lngMax: 139.70 },
      "埼玉県":   { latMin: 35.74, latMax: 36.30, lngMin: 138.72, lngMax: 139.93 },
      "千葉県":   { latMin: 34.90, latMax: 36.00, lngMin: 139.73, lngMax: 140.95 },
      "東京都":   { latMin: 35.51, latMax: 35.90, lngMin: 138.94, lngMax: 139.92 },
      "神奈川県": { latMin: 35.10, latMax: 35.68, lngMin: 138.93, lngMax: 139.78 },
      "新潟県":   { latMin: 36.80, latMax: 38.60, lngMin: 137.60, lngMax: 139.60 },
      "富山県":   { latMin: 36.40, latMax: 37.00, lngMin: 136.80, lngMax: 137.90 },
      "石川県":   { latMin: 36.10, latMax: 37.90, lngMin: 136.10, lngMax: 137.30 },
      "福井県":   { latMin: 35.40, latMax: 36.30, lngMin: 135.70, lngMax: 136.90 },
      "山梨県":   { latMin: 35.20, latMax: 35.90, lngMin: 138.20, lngMax: 139.20 },
      "長野県":   { latMin: 35.20, latMax: 37.00, lngMin: 137.30, lngMax: 138.90 },
      "岐阜県":   { latMin: 35.10, latMax: 36.50, lngMin: 136.30, lngMax: 137.80 },
      "静岡県":   { latMin: 34.60, latMax: 35.70, lngMin: 137.50, lngMax: 139.20 },
      "愛知県":   { latMin: 34.60, latMax: 35.50, lngMin: 136.70, lngMax: 137.80 },
      "三重県":   { latMin: 33.80, latMax: 35.20, lngMin: 135.80, lngMax: 136.90 },
      "滋賀県":   { latMin: 34.80, latMax: 35.70, lngMin: 135.90, lngMax: 136.60 },
      "京都府":   { latMin: 34.70, latMax: 35.80, lngMin: 135.00, lngMax: 135.90 },
      "大阪府":   { latMin: 34.30, latMax: 35.00, lngMin: 135.30, lngMax: 135.80 },
      "兵庫県":   { latMin: 34.20, latMax: 35.70, lngMin: 134.20, lngMax: 135.60 },
      "奈良県":   { latMin: 33.90, latMax: 34.90, lngMin: 135.60, lngMax: 136.20 },
      "和歌山県": { latMin: 33.40, latMax: 34.40, lngMin: 135.00, lngMax: 136.10 },
      "鳥取県":   { latMin: 35.00, latMax: 35.60, lngMin: 133.30, lngMax: 134.50 },
      "島根県":   { latMin: 34.20, latMax: 35.50, lngMin: 131.70, lngMax: 133.50 },
      "岡山県":   { latMin: 34.50, latMax: 35.20, lngMin: 133.20, lngMax: 134.50 },
      "広島県":   { latMin: 34.00, latMax: 35.20, lngMin: 132.00, lngMax: 133.90 },
      "山口県":   { latMin: 33.70, latMax: 34.70, lngMin: 130.80, lngMax: 132.20 },
      "徳島県":   { latMin: 33.50, latMax: 34.40, lngMin: 133.80, lngMax: 134.90 },
      "香川県":   { latMin: 34.10, latMax: 34.50, lngMin: 133.40, lngMax: 134.30 },
      "愛媛県":   { latMin: 32.90, latMax: 34.30, lngMin: 132.10, lngMax: 133.70 },
      "高知県":   { latMin: 32.70, latMax: 33.90, lngMin: 132.50, lngMax: 134.30 },
      "福岡県":   { latMin: 33.10, latMax: 34.30, lngMin: 130.00, lngMax: 131.20 },
      "佐賀県":   { latMin: 33.10, latMax: 33.70, lngMin: 129.70, lngMax: 130.60 },
      "長崎県":   { latMin: 32.00, latMax: 34.70, lngMin: 128.40, lngMax: 130.30 },
      "熊本県":   { latMin: 32.00, latMax: 33.20, lngMin: 130.10, lngMax: 131.40 },
      "大分県":   { latMin: 32.70, latMax: 33.70, lngMin: 130.80, lngMax: 131.90 },
      "宮崎県":   { latMin: 31.40, latMax: 32.90, lngMin: 130.70, lngMax: 131.90 },
      "鹿児島県": { latMin: 30.20, latMax: 32.00, lngMin: 130.20, lngMax: 131.30 },
      "沖縄県":   { latMin: 24.00, latMax: 26.90, lngMin: 122.90, lngMax: 131.30 },
    };

    const inBox = (lat: number, lng: number, b: Box) =>
      lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax;

    setCheckingMismatch(true);
    try {
      const supabase = createClient();
      type WishRow = { id: string; title: string; latitude: number; longitude: number; memo: string | null; wish_regions: { region: { name: string } | null }[] };
      let allWishes: WishRow[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("wishes")
          .select("id, title, latitude, longitude, memo, wish_regions(region:regions(name))")
          .eq("group_id", uuid)
          .is("deleted_at", null)
          .neq("region_check_ok", true)
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("id")
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        allWishes = allWishes.concat(data as unknown as WishRow[]);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const mismatches: MismatchItem[] = [];
      for (const w of allWishes) {
        const lat = w.latitude;
        const lng = w.longitude;
        const currentNames = (w.wish_regions ?? []).map((wr) => wr.region?.name).filter((n): n is string => Boolean(n));
        const broadTags = currentNames.filter((n) => BROAD_TAG_NAMES.has(n));
        if (broadTags.length === 0) continue; // 中地域タグなし → 判定不能

        let mismatch = false;
        let geocodedBroad: string | null = null;
        let geocodedSpecific: string | null = null;

        for (const tag of broadTags) {
          if (tag === "旅行先") {
            // 旅行先なのに関東圏内にある → 不一致
            if (inBox(lat, lng, KANTO)) { mismatch = true; geocodedBroad = "関東圏内"; break; }
          } else {
            // ローカルタグなのに該当都道府県の矩形外 → 不一致
            const box = BOUNDS[tag];
            if (box && !inBox(lat, lng, box)) {
              mismatch = true;
              geocodedBroad = inBox(lat, lng, KANTO) ? "関東圏内（別エリア）" : "関東圏外";
              break;
            }
          }
        }

        // 小地域タグから都道府県名を抽出して座標と照合
        if (!mismatch) {
          const specificTags = currentNames.filter((n) => !BROAD_TAG_NAMES.has(n));
          for (const tag of specificTags) {
            const pref = Object.keys(PREF_BOUNDS).find((p) => tag.startsWith(p));
            if (!pref) continue;
            const prefBox = PREF_BOUNDS[pref];
            if (!inBox(lat, lng, prefBox)) {
              mismatch = true;
              geocodedSpecific = inBox(lat, lng, KANTO) ? `座標は関東圏内（${tag}と不一致）` : `座標は${pref}圏外（${tag}と不一致）`;
              break;
            }
          }
        }

        if (mismatch) {
          const memoLines = w.memo?.split("\n") ?? [];
          const lastLine = memoLines[memoLines.length - 1]?.trim() ?? "";
          const memoUrl = /^https?:\/\//.test(lastLine) ? lastLine : null;
          mismatches.push({ id: w.id, title: w.title, latitude: lat, longitude: lng, memoUrl, currentRegions: currentNames, geocodedBroad, geocodedSpecific });
        }
      }
      setMismatchItems(mismatches);
      setMismatchDialogOpen(true);
    } catch {
      toast.error("チェックに失敗しました");
    } finally {
      setCheckingMismatch(false);
    }
  };

  const handleFixMismatch = async (item: MismatchItem) => {
    if (!item.memoUrl) return;
    setFixingMismatchId(item.id);
    try {
      const resp = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.memoUrl, name: item.title }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? `HTTP ${resp.status}`);
      }
      const place = await resp.json() as { placeId: string; latitude: number; longitude: number };
      const supabase = createClient();
      await supabase.from("wishes").update({ place_id: place.placeId, latitude: place.latitude, longitude: place.longitude }).eq("id", item.id);
      toast.success(`「${item.title}」の緯度経度を更新しました`);
      setMismatchItems((prev) => prev.filter((m) => m.id !== item.id));
    } catch (err) {
      toast.error(`更新失敗: ${err instanceof Error ? err.message : "不明なエラー"}`);
    } finally {
      setFixingMismatchId(null);
    }
  };

  const handleSaveMismatch = async (item: MismatchItem, selectedRegionIds: string[] | null) => {
    const inputs = mismatchManualInputs[item.id];
    const latNum = inputs?.lat ? parseFloat(inputs.lat) : NaN;
    const lngNum = inputs?.lng ? parseFloat(inputs.lng) : NaN;
    const hasLatLng = !isNaN(latNum) && !isNaN(lngNum);
    const hasRegions = selectedRegionIds !== null;
    if (!hasRegions && !hasLatLng) return;
    setSavingMismatchId(item.id);
    try {
      const supabase = createClient();
      if (hasRegions) {
        await supabase.from("wish_regions").delete().eq("wish_id", item.id);
        if (selectedRegionIds!.length > 0) {
          await supabase.from("wish_regions").insert(selectedRegionIds!.map((region_id) => ({ wish_id: item.id, region_id })));
        }
      }
      if (hasLatLng) {
        await supabase.from("wishes").update({ latitude: latNum, longitude: lngNum }).eq("id", item.id);
      }
      toast.success(`「${item.title}」を更新しました`);
      setMismatchItems((prev) => prev.filter((m) => m.id !== item.id));
      setMismatchManualInputs((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSavingMismatchId(null);
    }
  };

  const handleDismissMismatch = async (item: MismatchItem) => {
    setDismissingMismatchId(item.id);
    try {
      const supabase = createClient();
      await supabase.from("wishes").update({ region_check_ok: true }).eq("id", item.id);
      setMismatchItems((prev) => prev.filter((m) => m.id !== item.id));
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setDismissingMismatchId(null);
    }
  };

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/group/${uuid}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URLをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  const regionlessWishes = useMemo(() =>
    wishes.filter((w) => {
      const hasBroad = w.regions.some((r) => isBroadRegionTag(r.name));
      const hasSpecific = w.regions.some((r) => !isBroadRegionTag(r.name));
      return !hasBroad || !hasSpecific;
    }).sort((a, b) => a.id.localeCompare(b.id)),
    [wishes]
  );

  const locationlessWishes = useMemo(() =>
    wishes.filter((w) => w.latitude == null || w.longitude == null)
      .sort((a, b) => a.id.localeCompare(b.id)),
    [wishes]
  );

  const pageLoading = !group || genresLoading || regionsLoading;

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <TopBar title="設定" />
      {pageLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {pageLoading ? null :

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
          {group?.lastExportedAt && (
            <p className="text-xs text-muted-foreground">最終エクスポート: {new Date(group.lastExportedAt).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
          )}
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleExport} className="w-full gap-2" disabled={wishesLoadingLocal}>
              <Upload size={16} />
              {wishesLoadingLocal ? "読み込み中..." : `エクスポート（${wishCount ?? "..."}件）`}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full gap-2"
            >
              <Download size={16} />
              {importing ? "インポート中..." : "インポート"}
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">フルバックアップ：タスクに加えてジャンル・地域・ルーレット設定なども含めてエクスポート／インポートできます</p>
            <Button variant="outline" onClick={handleFullExport} className="w-full gap-2" disabled={wishesLoadingLocal}>
              <Upload size={16} />
              {wishesLoadingLocal ? "読み込み中..." : "フルバックアップ エクスポート"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fullFileInputRef.current?.click()}
              disabled={fullImporting}
              className="w-full gap-2"
            >
              <Download size={16} />
              {fullImporting ? "インポート中..." : "フルバックアップ インポート"}
            </Button>
            <input ref={fullFileInputRef} type="file" accept=".json" className="hidden" onChange={handleFullImport} />
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

        {(["LARGE", "MEDIUM", "SMALL"] as GenreType[]).map((gtype) => {
          const typeGenres = genres.filter((g) => g.genreType === gtype);
          const sectionOpen = gtype === "LARGE" ? genreLargeSectionOpen : gtype === "MEDIUM" ? genreMediumSectionOpen : genreSmallSectionOpen;
          const setSectionOpen = gtype === "LARGE" ? setGenreLargeSectionOpen : gtype === "MEDIUM" ? setGenreMediumSectionOpen : setGenreSmallSectionOpen;
          const label = GENRE_TYPE_LABELS[gtype];

          const renderGenreRow = (g: typeof typeGenres[0], idx: number, allInGroup: typeof typeGenres, moveUp: () => void, moveDown: () => void) => (
            <div key={g.id} className="flex items-center gap-2 py-1">
              {editingGenreId === g.id ? (
                <>
                  <div className="flex-1 flex flex-col gap-1">
                    <input
                      className="w-full text-sm border border-border rounded-lg px-2 py-1 bg-background"
                      value={editingGenreName}
                      onChange={(e) => setEditingGenreName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleEditGenre(g.id); if (e.key === "Escape") setEditingGenreId(null); }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {(["LARGE", "MEDIUM", "SMALL"] as GenreType[]).map((t) => (
                        <button key={t} type="button" onClick={() => setEditingGenreType(t)}
                          className={cn("px-2 py-0.5 rounded text-xs font-medium transition-colors", editingGenreType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          {GENRE_TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleEditGenre(g.id)} className="p-1.5 text-primary transition-colors"><Check size={15} /></button>
                  <button onClick={() => setEditingGenreId(null)} className="p-1.5 text-muted-foreground transition-colors"><X size={15} /></button>
                </>
              ) : (
                <>
                  <div className="flex flex-col">
                    <button onClick={moveUp} disabled={idx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ArrowUp size={12} /></button>
                    <button onClick={moveDown} disabled={idx === allInGroup.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ArrowDown size={12} /></button>
                  </div>
                  <span className="flex-1 text-sm">{g.name}</span>
                  {gtype === "SMALL" && (
                    <button
                      type="button"
                      title={smallGenreSubGroups.group2Ids.includes(g.id) ? `${smallGenreSubGroups.group1Name}へ移動` : `${smallGenreSubGroups.group2Name}へ移動`}
                      onClick={() => {
                        const next = smallGenreSubGroups.group2Ids.includes(g.id)
                          ? { ...smallGenreSubGroups, group2Ids: smallGenreSubGroups.group2Ids.filter((id) => id !== g.id) }
                          : { ...smallGenreSubGroups, group2Ids: [...smallGenreSubGroups.group2Ids, g.id] };
                        setSmallGenreSubGroupsState(next);
                      }}
                      className="p-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {smallGenreSubGroups.group2Ids.includes(g.id) ? "①" : "②"}
                    </button>
                  )}
                  <button onClick={() => { setEditingGenreId(g.id); setEditingGenreName(g.name); setEditingGenreType(g.genreType); }} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => handleDeleteGenre(g.id, g.name)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={15} /></button>
                </>
              )}
            </div>
          );

          return (
            <section key={gtype} className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center">
                <h2 className="font-semibold flex-1">{label}管理</h2>
                <button
                  onClick={() => { setAddingGenreType(gtype); setNewGenreName(""); setSectionOpen(true); }}
                  className={cn("p-1.5 text-muted-foreground hover:text-foreground transition-colors", !sectionOpen && "invisible")}
                >
                  <Plus size={16} />
                </button>
                <button type="button" className="p-1.5" onClick={() => setSectionOpen((v) => !v)}>
                  {sectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
              </div>
              {sectionOpen && (
                <div className="flex flex-col gap-2">
                  {gtype === "SMALL" ? (() => {
                    const group1 = typeGenres.filter((g) => !smallGenreSubGroups.group2Ids.includes(g.id));
                    const group2 = typeGenres.filter((g) => smallGenreSubGroups.group2Ids.includes(g.id));
                    const SubGroupHeader = ({ groupNum, name }: { groupNum: 1 | 2; name: string }) => (
                      <div className="flex items-center gap-1 mt-1 mb-0.5">
                        {editingSubGroupName === groupNum ? (
                          <>
                            <input
                              className="flex-1 text-xs border border-border rounded px-2 py-0.5 bg-background"
                              value={subGroupNameInput}
                              onChange={(e) => setSubGroupNameInput(e.target.value)}
                              onCompositionStart={() => { subGroupNameComposing.current = true; }}
                              onCompositionEnd={() => { subGroupNameComposing.current = false; }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !subGroupNameComposing.current) {
                                  const next = groupNum === 1
                                    ? { ...smallGenreSubGroups, group1Name: subGroupNameInput.trim() || name }
                                    : { ...smallGenreSubGroups, group2Name: subGroupNameInput.trim() || name };
                                  setSmallGenreSubGroupsState(next);
                                  setEditingSubGroupName(null);
                                }
                                if (e.key === "Escape") setEditingSubGroupName(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => {
                              const next = groupNum === 1
                                ? { ...smallGenreSubGroups, group1Name: subGroupNameInput.trim() || name }
                                : { ...smallGenreSubGroups, group2Name: subGroupNameInput.trim() || name };
                              setSmallGenreSubGroupsState(next);
                              setEditingSubGroupName(null);
                            }} className="p-0.5 text-primary"><Check size={12} /></button>
                            <button onClick={() => setEditingSubGroupName(null)} className="p-0.5 text-muted-foreground"><X size={12} /></button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-medium text-muted-foreground flex-1">{name}</span>
                            <button type="button" onClick={() => { setEditingSubGroupName(groupNum); setSubGroupNameInput(name); }} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"><Pencil size={11} /></button>
                          </>
                        )}
                      </div>
                    );
                    return (
                      <>
                        <SubGroupHeader groupNum={1} name={smallGenreSubGroups.group1Name} />
                        {group1.map((g, idx) => renderGenreRow(g, idx, group1, () => moveGenre("SMALL", typeGenres.indexOf(g), -1), () => moveGenre("SMALL", typeGenres.indexOf(g), 1)))}
                        {group1.length === 0 && <p className="text-xs text-muted-foreground pl-1">（なし）</p>}
                        <div className="border-t border-border/40 mt-1" />
                        <SubGroupHeader groupNum={2} name={smallGenreSubGroups.group2Name} />
                        {group2.map((g, idx) => renderGenreRow(g, idx, group2, () => moveGenre("SMALL", typeGenres.indexOf(g), -1), () => moveGenre("SMALL", typeGenres.indexOf(g), 1)))}
                        {group2.length === 0 && <p className="text-xs text-muted-foreground pl-1">（なし）</p>}
                        <p className="text-xs text-muted-foreground">②ボタンで{smallGenreSubGroups.group2Name}へ、①ボタンで{smallGenreSubGroups.group1Name}へ移動</p>
                      </>
                    );
                  })() : typeGenres.map((g, idx) => renderGenreRow(g, idx, typeGenres, () => moveGenre(gtype, idx, -1), () => moveGenre(gtype, idx, 1)))}
                  {addingGenreType === gtype && (
                    <div className="flex items-center gap-2 py-1">
                      <input
                        className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                        placeholder={`${label}名`}
                        value={newGenreName}
                        onChange={(e) => setNewGenreName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddGenre(); if (e.key === "Escape") setAddingGenreType(null); }}
                        autoFocus
                      />
                      <button onClick={handleAddGenre} className="p-1.5 text-primary transition-colors"><Check size={15} /></button>
                      <button onClick={() => setAddingGenreType(null)} className="p-1.5 text-muted-foreground transition-colors"><X size={15} /></button>
                    </div>
                  )}
                  {typeGenres.length === 0 && addingGenreType !== gtype && (
                    <p className="text-sm text-muted-foreground">+ボタンで{label}を追加できます</p>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {genres.length > 0 && (
          <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
            <div className="flex items-center">
              <div className="flex-1">
                <h2 className="font-semibold">デフォルト非表示ジャンル</h2>
                <p className="text-xs text-muted-foreground mt-0.5">タップしたジャンルはデフォルトで除外されます</p>
              </div>
              <span className="p-1.5 invisible"><Plus size={16} /></span>
              <button
                type="button"
                className="p-1.5"
                onClick={() => setDefaultExcludeGenreSectionOpen((v) => !v)}
              >
                {defaultExcludeGenreSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>
            </div>
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

        {/* 中地域タグ管理 */}
        {(() => {
          const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center">
                <h2 className="font-semibold flex-1">中地域タグ管理</h2>
                <button
                  onClick={() => { setAddingBroadRegion(true); setNewBroadRegionName(""); }}
                  className={cn("p-1.5 text-muted-foreground hover:text-foreground transition-colors", !broadRegionSectionOpen && "invisible")}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="p-1.5"
                  onClick={() => setBroadRegionSectionOpen((v) => !v)}
                >
                  {broadRegionSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
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
                  {addingBroadRegion && (
                    <div className="flex items-center gap-2 py-1">
                      <input
                        className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                        placeholder="中地域タグ名"
                        value={newBroadRegionName}
                        onChange={(e) => setNewBroadRegionName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddBroadRegion(); if (e.key === "Escape") setAddingBroadRegion(false); }}
                        autoFocus
                      />
                      <button onClick={handleAddBroadRegion} className="p-1.5 text-primary transition-colors"><Check size={15} /></button>
                      <button onClick={() => setAddingBroadRegion(false)} className="p-1.5 text-muted-foreground transition-colors"><X size={15} /></button>
                    </div>
                  )}
                  {broadRegions.length === 0 && !addingBroadRegion && (
                    <p className="text-sm text-muted-foreground">+ボタンで中地域タグを追加できます</p>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        {(() => {
          const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
          if (broadRegions.length === 0) return null;
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <h2 className="font-semibold">デフォルト非表示中地域タグ</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">タップした中地域タグはデフォルトで除外されます</p>
                </div>
                <span className="p-1.5 invisible"><Plus size={16} /></span>
                <button
                  type="button"
                  className="p-1.5"
                  onClick={() => setDefaultExcludeRegionSectionOpen((v) => !v)}
                >
                  {defaultExcludeRegionSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
              </div>
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

        {/* 小地域タグ管理 */}
        {(() => {
          const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
            .sort((a, b) => {
              const [ga, na] = specificRegionSortKey(a.name);
              const [gb, nb] = specificRegionSortKey(b.name);
              if (ga !== gb) return ga - gb;
              return na.localeCompare(nb, "ja");
            });
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center">
                <h2 className="font-semibold flex-1">小地域タグ管理</h2>
                <button
                  onClick={() => { setAddingSpecificRegion(true); setNewSpecificRegionName(""); }}
                  className={cn("p-1.5 text-muted-foreground hover:text-foreground transition-colors", !specificRegionSectionOpen && "invisible")}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="p-1.5"
                  onClick={() => setSpecificRegionSectionOpen((v) => !v)}
                >
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
                  {addingSpecificRegion && (
                    <div className="flex items-center gap-2 py-1">
                      <input
                        className="flex-1 text-sm border border-border rounded-lg px-2 py-1 bg-background"
                        placeholder="小地域タグ名（例：東京都新宿区）"
                        value={newSpecificRegionName}
                        onChange={(e) => setNewSpecificRegionName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddSpecificRegion(); if (e.key === "Escape") setAddingSpecificRegion(false); }}
                        autoFocus
                      />
                      <button onClick={handleAddSpecificRegion} className="p-1.5 text-primary transition-colors"><Check size={15} /></button>
                      <button onClick={() => setAddingSpecificRegion(false)} className="p-1.5 text-muted-foreground transition-colors"><X size={15} /></button>
                    </div>
                  )}
                  {specificRegions.length === 0 && !addingSpecificRegion && (
                    <p className="text-sm text-muted-foreground">CSVインポート時に自動生成、または+ボタンで追加できます</p>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        {/* 地域タグ未設定アイテム */}
        {(() => {
          const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
          const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))]
            .sort((a, b) => {
              const [ga, na] = specificRegionSortKey(a.name);
              const [gb, nb] = specificRegionSortKey(b.name);
              if (ga !== gb) return ga - gb;
              return na.localeCompare(nb, "ja");
            });
          if (regions.length === 0) return null;
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <h2 className="font-semibold">地域タグ未設定</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {regionlessCount === null ? "—" : regionlessCount > 0 ? `${regionlessCount}件未設定` : "全件設定済み"}
                  </p>
                </div>
                <span className="p-1.5 invisible"><Plus size={16} /></span>
                <button
                  type="button"
                  className="p-1.5"
                  onClick={async () => {
                    const next = !regionlessSectionOpen;
                    setRegionlessSectionOpen(next);
                    if (next) await ensureWishesLoaded();
                  }}
                >
                  {regionlessSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
              </div>
              {regionlessSectionOpen && (
                <div className="flex flex-col gap-2">
                  {wishesLoadingLocal ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    </div>
                  ) : regionlessWishes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">地域タグ未設定のアイテムはありません</p>
                  ) : regionlessWishes.map((w) => {
                    const expanded = regionlessExpandedId === w.id;
                    const currentRegionIds = w.regions.map((r) => r.id);
                    const memoLines = w.memo?.split("\n") ?? [];
                    const memoLastLine = memoLines[memoLines.length - 1]?.trim() ?? "";
                    const memoUrl = /^https?:\/\//.test(memoLastLine) ? memoLastLine : null;
                    return (
                      <div key={w.id} className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center">
                          <button
                            type="button"
                            className="flex-1 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors min-w-0 text-sm truncate"
                            onClick={() => setRegionlessExpandedId(expanded ? null : w.id)}
                          >
                            {w.title}
                          </button>
                          <button
                            type="button"
                            className="px-2 py-2.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            onClick={() => { navigator.clipboard.writeText(w.title); toast.success("コピーしました"); }}
                          >
                            <Copy size={14} />
                          </button>
                          {memoUrl && (
                            <a
                              href={memoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-2.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                              onClick={() => setRegionlessExpandedId(w.id)}
                            >
                              <MapPin size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            className="px-2 py-2.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            onClick={() => { if (confirm(`「${w.title}」を削除しますか？`)) deleteWish(w.id); }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="px-2.5 py-2.5 text-muted-foreground shrink-0"
                            onClick={() => setRegionlessExpandedId(expanded ? null : w.id)}
                          >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
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
                                        onClick={() => {
                                          const specificIds = currentRegionIds.filter((id) => specificRegions.some((s) => s.id === id));
                                          const next = selected ? specificIds : [...specificIds, r.id];
                                          saveRegionTags(w.id, next);
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
                                        onClick={() => {
                                          const broadIds = currentRegionIds.filter((id) => broadRegions.some((b) => b.id === id));
                                          const next = selected ? broadIds : [...broadIds, r.id];
                                          saveRegionTags(w.id, next);
                                        }}
                                        className={cn(
                                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                                          specificRegionColorClasses(r.name, selected)
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

        {(() => {
          return (
            <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
              <div className="flex items-center">
                <div className="flex-1">
                  <h2 className="font-semibold">緯度経度未設定</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {locationlessCount === null ? "—" : locationlessCount > 0 ? `${locationlessCount}件未設定` : "全件設定済み"}
                  </p>
                </div>
                <span className="p-1.5 invisible"><Plus size={16} /></span>
                <button
                  type="button"
                  className="p-1.5"
                  onClick={async () => {
                    const next = !locationlessSectionOpen;
                    setLocationlessSectionOpen(next);
                    if (next) await ensureWishesLoaded();
                  }}
                >
                  {locationlessSectionOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
              </div>
              {locationlessSectionOpen && (
                <div className="flex flex-col gap-2">
                  {wishesLoadingLocal ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    </div>
                  ) : locationlessWishes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">緯度経度未設定のアイテムはありません</p>
                  ) : locationlessWishes.map((w) => {
                    const expanded = locationlessExpandedId === w.id;
                    const memoLines = w.memo?.split("\n") ?? [];
                    const memoLastLine = memoLines[memoLines.length - 1]?.trim() ?? "";
                    const memoUrl = /^https?:\/\//.test(memoLastLine) ? memoLastLine : null;
                    const inputs = locationInputs[w.id] ?? { lat: w.latitude?.toString() ?? "", lng: w.longitude?.toString() ?? "" };
                    const latNum = parseFloat(inputs.lat);
                    const lngNum = parseFloat(inputs.lng);
                    const canSave = !isNaN(latNum) && !isNaN(lngNum) && inputs.lat !== "" && inputs.lng !== "";
                    return (
                      <div key={w.id} className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center">
                          <button
                            type="button"
                            className="flex-1 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors min-w-0 text-sm truncate"
                            onClick={() => setLocationlessExpandedId(expanded ? null : w.id)}
                          >
                            {w.title}
                          </button>
                          <button
                            type="button"
                            className="px-2 py-2.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            onClick={() => { navigator.clipboard.writeText(w.title); toast.success("コピーしました"); }}
                          >
                            <Copy size={14} />
                          </button>
                          {memoUrl && (
                            <a
                              href={memoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-2.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                              onClick={() => setLocationlessExpandedId(w.id)}
                            >
                              <MapPin size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            className="px-2 py-2.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            onClick={() => { if (confirm(`「${w.title}」を削除しますか？`)) deleteWish(w.id); }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="px-2.5 py-2.5 text-muted-foreground shrink-0"
                            onClick={() => setLocationlessExpandedId(expanded ? null : w.id)}
                          >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                        {expanded && (
                          <div className="px-3 pb-3 flex flex-col gap-2.5 border-t border-border pt-2.5">
                            <div className="flex gap-2">
                              <div className="flex-1 flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground font-medium">緯度</label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="例: 35.6812"
                                  value={inputs.lat}
                                  onChange={(e) => setLocationInputs((prev) => ({ ...prev, [w.id]: { ...inputs, lat: e.target.value } }))}
                                  onPaste={(e) => {
                                    const text = e.clipboardData.getData("text");
                                    const match = text.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
                                    if (match) {
                                      e.preventDefault();
                                      setLocationInputs((prev) => ({ ...prev, [w.id]: { lat: match[1], lng: match[2] } }));
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm"
                                />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground font-medium">経度</label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="例: 139.7671"
                                  value={inputs.lng}
                                  onChange={(e) => setLocationInputs((prev) => ({ ...prev, [w.id]: { ...inputs, lng: e.target.value } }))}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              disabled={!canSave || savingLocationWishId === w.id}
                              onClick={() => saveLocation(w.id, latNum, lngNum)}
                              className="w-full"
                            >
                              {savingLocationWishId === w.id ? "保存中..." : "保存"}
                            </Button>
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
          <h2 className="font-semibold">CSVジャンル付与</h2>
          <p className="text-xs text-muted-foreground">CSVファイルを元に、既存タスクへ大・中・小ジャンルを一括付与します。新規登録は行いません。</p>
          <Button variant="outline" className="w-full" onClick={() => setCsvGenreAssignOpen(true)}>
            <Upload size={15} className="mr-2" />
            CSVからジャンルを付与する
          </Button>
        </section>

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
                      const memoLines = item.memo?.split("\n") ?? [];
                      const memoLastLine = memoLines[memoLines.length - 1]?.trim() ?? "";
                      const memoUrl = /^https?:\/\//.test(memoLastLine) ? memoLastLine : null;
                      return (
                        <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-b-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground">残り{daysLeft}日</p>
                          </div>
                          <button
                            onClick={async () => { try { await restoreWish(item.id); await refetchWishes(); toast.success("復元しました"); } catch { toast.error("復元に失敗しました"); } }}
                            className="text-xs text-primary hover:underline shrink-0"
                          >
                            復元
                          </button>
                          {memoUrl && (
                            <a
                              href={memoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
                            >
                              <MapPin size={14} />
                            </a>
                          )}
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const items = [...trashItems];
                          for (const item of items) { await restoreWish(item.id); }
                          await refetchWishes();
                          toast.success(`${items.length}件を復元しました`);
                        } catch { toast.error("復元に失敗しました"); }
                      }}
                      className="flex-1"
                    >
                      全件復元
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => { if (!confirm("ごみ箱を空にしますか？元に戻せません。")) return; try { await emptyTrash(); toast.success("ごみ箱を空にしました"); } catch { toast.error("失敗しました"); } }}
                      className="flex-1"
                    >
                      ごみ箱を空にする
                    </Button>
                  </div>
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
          <Button
            variant="outline"
            onClick={() => setRetryLocationDialogOpen(true)}
            disabled={retryingLocation}
            className="w-full gap-2"
          >
            <MapPin size={16} />
            {retryingLocation ? "取得中..." : "位置情報を再取得"}
          </Button>
          <Button
            variant="outline"
            onClick={async () => { await ensureWishesLoaded(); setMergeDialogOpen(true); }}
            disabled={merging || wishesLoadingLocal}
            className="w-full gap-2"
          >
            <GitMerge size={16} />
            {merging ? "統合中..." : wishesLoadingLocal ? "読み込み中..." : "重複を統合"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCheckRegionMismatch}
            disabled={checkingMismatch}
            className="w-full gap-2"
          >
            <MapPin size={16} />
            {checkingMismatch ? "チェック中..." : "地域タグ不一致をチェック"}
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
      </div>}

      <BottomNav groupId={uuid} />

      <CsvGenreAssignDialog
        open={csvGenreAssignOpen}
        onClose={() => setCsvGenreAssignOpen(false)}
        groupId={uuid}
        genres={genres}
      />

      <Dialog open={retryLocationDialogOpen} onOpenChange={setRetryLocationDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>位置情報を再取得</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <p className="text-sm">Google Maps URLから位置情報を取得します。</p>
            <p className="text-sm text-muted-foreground">この操作はGoogle Maps APIを消費します。対象件数が多い場合はAPIのクォータに影響する場合があります。</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRetryLocationDialogOpen(false)}>キャンセル</Button>
            <Button onClick={() => { setRetryLocationDialogOpen(false); handleRetryLocation(); }}>
              取得する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>重複を統合</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
                checked={mergeWishes}
                onChange={(e) => setMergeWishes(e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium">同名スポットを統合する</p>
                <p className="text-xs text-muted-foreground mt-0.5">タスク名が同じスポットをひとつにまとめます（メモ・ジャンル・地域・季節はマージ）</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
                checked={mergeRegionTags}
                onChange={(e) => setMergeRegionTags(e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium">重複する地域タグを統合する</p>
                <p className="text-xs text-muted-foreground mt-0.5">名前が同じ中地域・小地域タグをひとつにまとめます</p>
              </div>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>キャンセル</Button>
            <Button
              disabled={!mergeWishes && !mergeRegionTags}
              onClick={() => handleMergeDuplicates({ wishes: mergeWishes, regionTags: mergeRegionTags })}
            >
              統合する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={mismatchDialogOpen} onOpenChange={setMismatchDialogOpen}>
        <DialogContent className="max-w-md w-full max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>地域タグ不一致チェック結果</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 flex flex-col gap-2 py-2">
            {mismatchItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">不一致のアイテムはありませんでした 🎉</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{mismatchItems.length}件の不一致が見つかりました。lat/lngが古い位置を指している可能性があります。</p>
                {mismatchItems.map((item) => (
                  <div key={item.id} className="border border-border rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium flex-1 min-w-0 break-words">{item.title}</p>
                      {item.memoUrl && (
                        <a href={item.memoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                          <MapPin size={14} />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex gap-1.5">
                        <span className="text-muted-foreground shrink-0">現在のタグ:</span>
                        <span className="text-foreground">{item.currentRegions.join(", ") || "なし"}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="text-muted-foreground shrink-0">lat/lngから:</span>
                        <span className="text-destructive">{[item.geocodedBroad, item.geocodedSpecific].filter(Boolean).join(", ") || "取得不可"}</span>
                      </div>
                      <div className="flex gap-1.5 text-muted-foreground/60">
                        <span className="shrink-0">座標:</span>
                        <span>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-border/60">
                      {/* 地域タグ手動設定（折りたたみ） */}
                      {(() => {
                        const tagOpen = !!(mismatchRegionSelections[item.id]);
                        const selected = mismatchRegionSelections[item.id] ?? item.currentRegions.map((name) => regions.find((r) => r.name === name)?.id).filter((id): id is string => Boolean(id));
                        const broadRegions = regions.filter((r) => isBroadRegionTag(r.name));
                        const specificRegions = [...regions.filter((r) => !isBroadRegionTag(r.name))].sort((a, b) => {
                          const [ga, na] = specificRegionSortKey(a.name);
                          const [gb, nb] = specificRegionSortKey(b.name);
                          return ga !== gb ? ga - gb : na.localeCompare(nb, "ja");
                        });
                        const toggle = (id: string) => {
                          const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
                          setMismatchRegionSelections((prev) => ({ ...prev, [item.id]: next }));
                        };
                        return (
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!tagOpen) setMismatchRegionSelections((prev) => ({ ...prev, [item.id]: selected }));
                                else setMismatchRegionSelections((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
                              }}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors self-start"
                            >
                              {tagOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              地域タグを変更
                            </button>
                            {tagOpen && (
                              <div className="flex flex-col gap-1.5">
                                {broadRegions.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium">中地域</span>
                                    <div className="flex flex-wrap gap-1">
                                      {broadRegions.map((r) => (
                                        <button key={r.id} type="button" onClick={() => toggle(r.id)}
                                          className={cn("px-2 py-0.5 rounded-lg text-xs font-medium transition-colors", selected.includes(r.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                                        >{r.name}</button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {specificRegions.length > 0 && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium">小地域</span>
                                    <div className="flex flex-wrap gap-1">
                                      {specificRegions.map((r) => (
                                        <button key={r.id} type="button" onClick={() => toggle(r.id)}
                                          className={cn("px-2 py-0.5 rounded-lg text-xs font-medium transition-colors", selected.includes(r.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                                        >{r.name}</button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {item.memoUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs gap-1"
                          disabled={fixingMismatchId === item.id || savingMismatchId === item.id}
                          onClick={() => handleFixMismatch(item)}
                        >
                          <MapPin size={12} />
                          {fixingMismatchId === item.id ? "取得中..." : "URLからlat/lngを再取得"}
                        </Button>
                      )}
                      {(() => {
                        const tagOpen = !!(mismatchRegionSelections[item.id]);
                        const selected = mismatchRegionSelections[item.id] ?? item.currentRegions.map((name) => regions.find((r) => r.name === name)?.id).filter((id): id is string => Boolean(id));
                        const inputs = mismatchManualInputs[item.id];
                        const latNum = inputs?.lat ? parseFloat(inputs.lat) : NaN;
                        const lngNum = inputs?.lng ? parseFloat(inputs.lng) : NaN;
                        const hasLatLng = !isNaN(latNum) && !isNaN(lngNum);
                        const canSave = tagOpen || hasLatLng;
                        return (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex gap-1.5 items-end">
                              <div className="flex-1 flex flex-col gap-0.5">
                                <label className="text-[10px] text-muted-foreground">緯度</label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="35.6812"
                                  value={inputs?.lat ?? ""}
                                  onChange={(e) => setMismatchManualInputs((prev) => ({ ...prev, [item.id]: { lat: e.target.value, lng: prev[item.id]?.lng ?? "" } }))}
                                  onPaste={(e) => {
                                    const text = e.clipboardData.getData("text");
                                    const match = text.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
                                    if (match) { e.preventDefault(); setMismatchManualInputs((prev) => ({ ...prev, [item.id]: { lat: match[1], lng: match[2] } })); }
                                  }}
                                  className="w-full px-2 py-1 rounded-lg border border-border bg-background text-xs"
                                />
                              </div>
                              <div className="flex-1 flex flex-col gap-0.5">
                                <label className="text-[10px] text-muted-foreground">経度</label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="139.7670"
                                  value={inputs?.lng ?? ""}
                                  onChange={(e) => setMismatchManualInputs((prev) => ({ ...prev, [item.id]: { lat: prev[item.id]?.lat ?? "", lng: e.target.value } }))}
                                  className="w-full px-2 py-1 rounded-lg border border-border bg-background text-xs"
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs"
                              disabled={savingMismatchId === item.id || fixingMismatchId === item.id || !canSave}
                              onClick={() => handleSaveMismatch(item, tagOpen ? selected : null)}
                            >
                              {savingMismatchId === item.id ? "保存中..." : "保存"}
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={dismissingMismatchId === item.id}
                        onClick={() => handleDismissMismatch(item)}
                      >
                        {dismissingMismatchId === item.id ? "処理中..." : "今後表示しない"}
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMismatchDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
