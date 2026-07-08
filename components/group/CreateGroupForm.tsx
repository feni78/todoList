"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroup } from "@/hooks/useGroup";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export function CreateGroupForm() {
  const router = useRouter();
  const { createGroup, loading } = useGroup();
  const [groupName, setGroupName] = useState("");
  const [nickname, setNickname] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !nickname.trim()) return;

    try {
      const { group } = await createGroup(groupName.trim(), nickname.trim());
      const url = `${window.location.origin}/group/${group.id}`;
      setCreatedUrl(url);
      toast.success("グループを作成しました！");
    } catch {
      toast.error("グループの作成に失敗しました");
    }
  };

  const handleCopy = async () => {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    toast.success("URLをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGo = () => {
    if (!createdUrl) return;
    const uuid = createdUrl.split("/group/")[1];
    router.push(`/group/${uuid}`);
  };

  if (createdUrl) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">グループが作成されました</p>
          <p className="font-semibold">パートナーにURLを共有しよう</p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
          <span className="text-xs text-muted-foreground truncate flex-1">{createdUrl}</span>
          <Button size="icon" variant="ghost" onClick={handleCopy} className="shrink-0">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>
        <Button onClick={handleGo} className="w-full">
          リストを開く
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="groupName">グループ名</Label>
        <Input
          id="groupName"
          placeholder="例：やりたいことリスト"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nickname">あなたのニックネーム</Label>
        <Input
          id="nickname"
          placeholder="例：たろう"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading || !groupName.trim() || !nickname.trim()} className="w-full">
        {loading ? "作成中..." : "グループを作成"}
      </Button>
    </form>
  );
}
