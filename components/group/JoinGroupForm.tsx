"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroup } from "@/hooks/useGroup";
import { GroupMember } from "@/types";
import { toast } from "sonner";
import { UserCircle2, Plus } from "lucide-react";

interface JoinGroupFormProps {
  groupId: string;
  groupName: string;
  existingMembers: GroupMember[];
  onJoined: () => void;
  onSelectMember: (member: GroupMember) => void;
}

export function JoinGroupForm({ groupId, groupName, existingMembers, onJoined, onSelectMember }: JoinGroupFormProps) {
  const { joinGroup, loading } = useGroup();
  const [mode, setMode] = useState<"select" | "new">(existingMembers.length > 0 ? "select" : "new");
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

  if (mode === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">{groupName}</p>
          <p className="text-lg font-bold">あなたはどちらですか？</p>
        </div>

        <div className="flex flex-col gap-2">
          {existingMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMember(m)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
            >
              <UserCircle2 size={20} className="text-muted-foreground shrink-0" />
              <span className="font-medium">{m.nickname}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setMode("new")}
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={14} />
          新しく参加する
        </button>
      </div>
    );
  }

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
        {existingMembers.length > 0 && (
          <button
            type="button"
            onClick={() => setMode("select")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            既存のメンバーから選ぶ
          </button>
        )}
      </form>
    </div>
  );
}
