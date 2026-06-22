-- RLS policies for futari-yaritai

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (true);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON group_members FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "members_insert" ON group_members FOR INSERT
  WITH CHECK (true);

ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishes_select" ON wishes FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "wishes_insert" ON wishes FOR INSERT
  WITH CHECK (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "wishes_update" ON wishes FOR UPDATE
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

CREATE POLICY "wishes_delete" ON wishes FOR DELETE
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));

ALTER TABLE wish_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wish_seasons_all" ON wish_seasons FOR ALL
  USING (wish_id IN (
    SELECT id FROM wishes WHERE group_id IN (
      SELECT group_id FROM group_members
      WHERE id = current_setting('app.member_id', true)::uuid
    )
  ));

ALTER TABLE wish_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wish_histories_all" ON wish_histories FOR ALL
  USING (wish_id IN (
    SELECT id FROM wishes WHERE group_id IN (
      SELECT group_id FROM group_members
      WHERE id = current_setting('app.member_id', true)::uuid
    )
  ));

ALTER TABLE roulette_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roulette_settings_all" ON roulette_settings FOR ALL
  USING (group_id IN (
    SELECT group_id FROM group_members
    WHERE id = current_setting('app.member_id', true)::uuid
  ));
