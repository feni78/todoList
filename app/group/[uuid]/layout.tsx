"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { getGroupMember, saveGroupMember, getDefaultExcludeGenreIds, getDefaultExcludeRegionIds } from "@/lib/utils/localStorage";
import { useFilterStore } from "@/lib/store/filterStore";
import { JoinGroupForm } from "@/components/group/JoinGroupForm";
import { useGroupStore } from "@/lib/store/groupStore";
import { createClient } from "@/lib/supabase/client";
import { Group, GroupMember } from "@/types";

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  const { uuid } = useParams<{ uuid: string }>();
  const pathname = usePathname();
  const { setGroup, setCurrentMember, group } = useGroupStore();
  const { setDefaultExcludeGenreIds, setExcludeGenreIds, setDefaultExcludeRegionIds, setExcludeRegionIds } = useFilterStore();
  const [checking, setChecking] = useState(true);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [groupName, setGroupName] = useState("");
  const groupTitle = group?.name || groupName;

  useEffect(() => {
    if (groupTitle) document.title = groupTitle;
  }, [groupTitle, pathname]);

  useEffect(() => {
    const init = async () => {
      const stored = getGroupMember(uuid);
      const supabase = createClient();

      const { data: groupData } = await supabase
        .from("groups")
        .select("*, members:group_members(*)")
        .eq("id", uuid)
        .single();

      if (!groupData) {
        setChecking(false);
        return;
      }

      const g = groupData as Group & { members: GroupMember[] };
      setGroup({ id: g.id, name: g.name, members: g.members });
      setGroupName(g.name);

      if (!stored) {
        setNeedsJoin(true);
        setChecking(false);
        return;
      }

      const memberExists = g.members.some((m) => m.id === stored.memberId);
      if (!memberExists) {
        setNeedsJoin(true);
        setChecking(false);
        return;
      }

      setCurrentMember({
        id: stored.memberId,
        groupId: uuid,
        nickname: stored.nickname,
      });
      setChecking(false);
    };

    init();
  }, [uuid, setGroup, setCurrentMember]);

  useEffect(() => {
    const defaults = getDefaultExcludeGenreIds(uuid);
    setDefaultExcludeGenreIds(defaults);
    setExcludeGenreIds(defaults);
    const regionDefaults = getDefaultExcludeRegionIds(uuid);
    setDefaultExcludeRegionIds(regionDefaults);
    setExcludeRegionIds(regionDefaults);
  }, [uuid, setDefaultExcludeGenreIds, setExcludeGenreIds, setDefaultExcludeRegionIds, setExcludeRegionIds]);

  const handleJoined = () => {
    const stored = getGroupMember(uuid);
    if (stored) {
      setCurrentMember({
        id: stored.memberId,
        groupId: uuid,
        nickname: stored.nickname,
      });
    }
    setNeedsJoin(false);
  };

  const handleSelectMember = (member: GroupMember) => {
    saveGroupMember({
      groupId: uuid,
      groupName: group?.name ?? "",
      memberId: member.id,
      nickname: member.nickname,
      lastVisitedAt: new Date().toISOString(),
    });
    setCurrentMember({ id: member.id, groupId: uuid, nickname: member.nickname });
    setNeedsJoin(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (needsJoin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 shadow-sm">
          <JoinGroupForm
            groupId={uuid}
            groupName={groupName || group?.name || "グループ"}
            existingMembers={group?.members ?? []}
            onJoined={handleJoined}
            onSelectMember={handleSelectMember}
          />
        </div>
      </main>
    );
  }

  return (
    <>
      {children}
    </>
  );
}
