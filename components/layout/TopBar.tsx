"use client";

import { useGroupStore } from "@/lib/store/groupStore";

interface TopBarProps {
  title?: string;
  right?: React.ReactNode;
}

export function TopBar({ title, right }: TopBarProps) {
  const group = useGroupStore((s) => s.group);
  const displayTitle = title ?? group?.name ?? "やりたいことリスト";

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-12 px-6 w-full">
        <h1 className="text-base font-semibold truncate">{displayTitle}</h1>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
