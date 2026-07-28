ALTER TABLE wishes
  ADD COLUMN IF NOT EXISTS region_check_ok boolean NOT NULL DEFAULT false;
