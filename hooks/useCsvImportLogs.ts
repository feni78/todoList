"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SkippedItem } from "@/hooks/useCsvImport";

export interface CsvImportLog {
  id: string;
  memberId: string;
  importedAt: string;
  fileNames: string[];
  inserted: number;
  updated: number;
  skipped: number;
  skippedItems: SkippedItem[];
}

export function useCsvImportLogs(groupId: string) {
  const [logs, setLogs] = useState<CsvImportLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("csv_import_logs")
      .select("id, member_id, imported_at, file_names, inserted, updated, skipped, skipped_items")
      .eq("group_id", groupId)
      .order("imported_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(
        data.map((row) => ({
          id: row.id as string,
          memberId: row.member_id as string,
          importedAt: row.imported_at as string,
          fileNames: (row.file_names as string[]) ?? [],
          inserted: row.inserted as number,
          updated: row.updated as number,
          skipped: row.skipped as number,
          skippedItems: (row.skipped_items as SkippedItem[]) ?? [],
        }))
      );
    }
    setLoading(false);
  }, [groupId]);

  return { logs, loading, fetchLogs };
}
