"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Status, STATUS_LABELS } from "@/types";

type TabValue = "ALL" | Status;

interface StatusTabsProps {
  value: TabValue;
  onChange: (v: TabValue) => void;
}

const TABS: { value: TabValue; label: string }[] = [
  { value: "ALL", label: "全て" },
  { value: "PENDING", label: STATUS_LABELS.PENDING },
  { value: "DONE", label: STATUS_LABELS.DONE },
  { value: "HOLD", label: STATUS_LABELS.HOLD },
];

export function StatusTabs({ value, onChange }: StatusTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TabValue)} className="w-full">
      <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10 p-0">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-1 rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-10"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
