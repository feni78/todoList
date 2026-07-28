ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS last_exported_at timestamptz;
