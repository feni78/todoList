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
  insertedItems: { title: string }[];
  updatedItems: { title: string }[];
  isFavorite: boolean;
}

export function useCsvImportLogs(groupId: string) {
  const [logs, setLogs] = useState<CsvImportLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchErr } = await supabase
      .from("csv_import_logs")
      .select("id, member_id, imported_at, file_names, inserted, updated, skipped, skipped_items, inserted_items, updated_items, is_favorite")
      .eq("group_id", groupId)
      .order("imported_at", { ascending: false })
      .limit(50);

    if (fetchErr) {
      setError(fetchErr.message);
    } else if (data) {
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
          insertedItems: (row.inserted_items as { title: string }[]) ?? [],
          updatedItems: (row.updated_items as { title: string }[]) ?? [],
          isFavorite: (row.is_favorite as boolean) ?? false,
        }))
      );
    }
    setLoading(false);
  }, [groupId]);

  const toggleFavorite = useCallback(async (id: string, value: boolean) => {
    // 楽観的更新
    setLogs((prev) => prev.map((log) => log.id === id ? { ...log, isFavorite: value } : log));
    const supabase = createClient();
    const { error } = await supabase
      .from("csv_import_logs")
      .update({ is_favorite: value })
      .eq("id", id);
    if (error) {
      // ロールバック
      setLogs((prev) => prev.map((log) => log.id === id ? { ...log, isFavorite: !value } : log));
    }
  }, []);

  return { logs, loading, error, fetchLogs, toggleFavorite };
}
