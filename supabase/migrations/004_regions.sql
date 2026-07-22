CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE wish_regions (
  wish_id UUID NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  PRIMARY KEY (wish_id, region_id)
);

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regions_all" ON regions FOR ALL
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

ALTER TABLE wish_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wish_regions_all" ON wish_regions FOR ALL
  USING (wish_id IN (
    SELECT id FROM wishes WHERE group_id IN (
      SELECT group_id FROM group_members
      WHERE id = current_setting('app.member_id', true)::uuid
    )
  ));

GRANT SELECT ON regions TO anon, authenticated;
GRANT SELECT ON wish_regions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON regions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON wish_regions TO authenticated;
