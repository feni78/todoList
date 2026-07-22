"use client";

import { useGroupStore } from "@/lib/store/groupStore";

interface TopBarProps {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function TopBar({ title, left, right }: TopBarProps) {
  const group = useGroupStore((s) => s.group);
  const displayTitle = title ?? group?.name ?? "やりたいことリスト";

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center h-12 px-2 w-full gap-1">
        {left && <div className="flex items-center">{left}</div>}
        <h1 className="flex-1 text-base font-semibold truncate px-2">{displayTitle}</h1>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
