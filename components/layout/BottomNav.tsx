"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Shuffle, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  groupId: string;
}

export function BottomNav({ groupId }: BottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: `/group/${groupId}`, label: "リスト", icon: List },
    { href: `/group/${groupId}/roulette`, label: "ルーレット", icon: Shuffle },
    { href: `/group/${groupId}/history`, label: "履歴", icon: History },
    { href: `/group/${groupId}/settings`, label: "設定", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-20 max-w-2xl mx-auto px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === `/group/${groupId}`
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
