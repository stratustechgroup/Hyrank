-- Migration 005 — ranking infrastructure
--   1. Enable pg_cron (Supabase Pro has it enabled by default — idempotent)
--   2. Schedule server_signals refresh every 10 min
--   3. Move updateServerRating from app code to DB trigger (update_rating_avg
--      function from migration 001 already does this — just ensure trigger exists)
--   4. Add helper SQL function for retention signal

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule server_signals refresh every 10 minutes. CONCURRENTLY requires the
-- unique index, which migration 003 added.
SELECT cron.schedule(
  'refresh_server_signals',
  '*/10 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.server_signals $$
);

-- Confirm the review-rating trigger is wired (was created in migration 001;
-- idempotent recreate just in case).
DROP TRIGGER IF EXISTS on_review_changed ON reviews;
CREATE TRIGGER on_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_rating_avg();

-- Retention signal helper function — callable from anywhere.
-- Returns fraction (0..1) of distinct voters in last 7 days who voted >=2 times.
CREATE OR REPLACE FUNCTION public.compute_retention_7d(p_server_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  WITH voter_stats AS (
    SELECT COALESCE(visitor_id, user_id::text) AS voter_id, COUNT(*) AS vote_count
    FROM public.votes
    WHERE server_id = p_server_id
      AND status IN ('valid','verified')
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY COALESCE(visitor_id, user_id::text)
  )
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 0::NUMERIC
    ELSE (COUNT(*) FILTER (WHERE vote_count >= 2))::NUMERIC / COUNT(*)::NUMERIC
  END
  FROM voter_stats;
$$;

-- Performance index: retention query does server_id + status + created_at filter
CREATE INDEX IF NOT EXISTS idx_votes_retention
  ON public.votes (server_id, status, created_at)
  WHERE status IN ('valid','verified');

-- Performance index: avg live players computation reads server_status_history recent
CREATE INDEX IF NOT EXISTS idx_status_history_server_recorded
  ON public.server_status_history (server_id, recorded_at DESC);
