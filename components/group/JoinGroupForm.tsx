"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroup } from "@/hooks/useGroup";
import { toast } from "sonner";

interface JoinGroupFormProps {
  groupId: string;
  groupName: string;
  onJoined: () => void;
}

export function JoinGroupForm({ groupId, groupName, onJoined }: JoinGroupFormProps) {
  const { joinGroup, loading } = useGroup();
  const [nickname, setNickname] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      await joinGroup(groupId, nickname.trim());
      toast.success(`「${groupName}」に参加しました！`);
      onJoined();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "参加に失敗しました";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-muted-foreground text-sm mb-1">招待されたグループ</p>
        <p className="text-xl font-bold">{groupName}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nickname">ニックネーム</Label>
          <Input
            id="nickname"
            placeholder="例：はなこ"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading || !nickname.trim()} className="w-full">
          {loading ? "参加中..." : "参加する"}
        </Button>
      </form>
    </div>
  );
}
