CREATE TABLE csv_import_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id    UUID        NOT NULL REFERENCES group_members(id),
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_names   TEXT[]      NOT NULL DEFAULT '{}',
  inserted     INTEGER     NOT NULL DEFAULT 0,
  updated      INTEGER     NOT NULL DEFAULT 0,
  skipped      INTEGER     NOT NULL DEFAULT 0,
  skipped_items JSONB      NOT NULL DEFAULT '[]'
);

ALTER TABLE csv_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csv_import_logs_select" ON csv_import_logs FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "csv_import_logs_insert" ON csv_import_logs FOR INSERT
  WITH CHECK (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));
