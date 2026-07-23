-- get_wishes_by_distance をステータス絞り込みなしに変更（履歴タブの距離フィルタ対応）
CREATE OR REPLACE FUNCTION get_wishes_by_distance(
  p_group_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_max_km DOUBLE PRECISION DEFAULT 5.0,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT sub.id, sub.distance_km
  FROM (
    SELECT
      w.id,
      6371.0 * acos(
        LEAST(1.0,
          cos(radians(p_lat)) * cos(radians(w.latitude))
          * cos(radians(w.longitude) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(w.latitude))
        )
      ) AS distance_km
    FROM wishes w
    WHERE
      w.group_id = p_group_id
      AND w.deleted_at IS NULL
      AND w.latitude IS NOT NULL
      AND w.longitude IS NOT NULL
  ) sub
  WHERE sub.distance_km <= p_max_km
  ORDER BY sub.distance_km
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_wishes_by_distance(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon, authenticated;
