"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGroup } from "@/hooks/useGroup";
import { useRouletteStore } from "@/lib/store/rouletteStore";
import { useWishes } from "@/hooks/useWishes";
import { useGroupStore } from "@/lib/store/groupStore";
import { getDarkMode, setDarkMode, getGroupMember } from "@/lib/utils/localStorage";
import { RouletteSettings, Priority, PRIORITY_LABELS, PRIORITY_ICONS, Wish } from "@/types";
import { Copy, Check, Download, Upload, Trash2 } from "lucide-react";
import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WEIGHT_PRIORITIES: { key: keyof RouletteSettings; priority: Priority }[] = [
  { key: "weightMax", priority: "MAX" },
  { key: "weightGold", priority: "GOLD" },
  { key: "weightSilver", priority: "SILVER" },
  { key: "weightBronze", priority: "BRONZE" },
];

export default function SettingsPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { fetchRouletteSettings, saveRouletteSettings } = useGroup();
  const { settings, setSettings } = useRouletteStore();
  const { wishes, createWish } = useWishes(uuid);
  const group = useGroupStore((s) => s.group);
  const currentMemberId = getGroupMember(uuid)?.memberId;
  const [darkMode, setDarkModeState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDarkModeState(getDarkMode());
    fetchRouletteSettings(uuid).then((data) => {
      if (data) {
        setSettings({
          considerLevel: (data as { consider_level: number }).consider_level,
          weightMax: (data as { weight_max: number }).weight_max,
          weightGold: (data as { weight_gold: number }).weight_gold,
          weightSilver: (data as { weight_silver: number }).weight_silver,
          weightBronze: (data as { weight_bronze: number }).weight_bronze,
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
      priority: w.priority,
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
            w.priority === (item.priority ?? "GOLD") &&
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
          priority: item.priority ?? "GOLD",
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
      window.location.reload();
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

      <div className="flex-1 flex flex-col gap-6 p-4 max-w-md mx-auto w-full">
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

          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <Label>やりたい度の重み</Label>
            {WEIGHT_PRIORITIES.map(({ key, priority }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    {PRIORITY_ICONS[priority]} {PRIORITY_LABELS[priority]}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">{settings[key]}</span>
                </div>
                <Slider
                  min={1}
                  max={100}
                  step={1}
                  value={[settings[key] as number]}
                  onValueChange={(vals) => {
                    const v = Array.isArray(vals) ? (vals as number[])[0] : (vals as number);
                    setSettings({ ...settings, [key]: v });
                  }}
                />
              </div>
            ))}
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
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">メンバー管理</h2>
          <div className="flex flex-col gap-2">
            {(group?.members ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1">
                <span className="text-sm">
                  {m.nickname}
                  {m.id === currentMemberId && (
                    <span className="ml-2 text-xs text-muted-foreground">（あなた）</span>
                  )}
                </span>
                <button
                  onClick={() => handleDeleteMember(m.id, m.nickname)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4">
          <h2 className="font-semibold">共有</h2>
          <p className="text-sm text-muted-foreground">
            このURLをパートナーに送ってグループに招待しよう
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
