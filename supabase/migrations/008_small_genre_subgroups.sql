ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS small_genre_subgroups JSONB
    NOT NULL DEFAULT '{"group1Name":"グループ①","group2Name":"グループ②","group2Ids":[]}';
