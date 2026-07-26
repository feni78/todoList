CREATE TABLE csv_genre_file_presets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  file_name       TEXT        NOT NULL,
  large_genre_id  UUID        REFERENCES genres(id) ON DELETE SET NULL,
  medium_genre_id UUID        REFERENCES genres(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, file_name)
);

ALTER TABLE csv_genre_file_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csv_genre_file_presets_select" ON csv_genre_file_presets FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "csv_genre_file_presets_upsert" ON csv_genre_file_presets FOR INSERT
  WITH CHECK (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "csv_genre_file_presets_update" ON csv_genre_file_presets FOR UPDATE
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));
