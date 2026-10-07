-- Add is_broad flag to regions
ALTER TABLE regions ADD COLUMN is_broad BOOLEAN NOT NULL DEFAULT false;

-- Set is_broad for existing default broad region names
UPDATE regions
SET is_broad = true
WHERE name IN ('東京23区', '東京市部', '神奈川', '千葉', '埼玉', '茨城', '旅行先');

-- Per-group prefix-to-broad-region mapping
CREATE TABLE region_prefix_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  broad_region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  prefecture TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, prefecture)
);

ALTER TABLE region_prefix_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "region_prefix_rules_all" ON region_prefix_rules FOR ALL
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

GRANT SELECT ON region_prefix_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON region_prefix_rules TO authenticated;
