-- Migration 004 -- advisor warning cleanup.
-- Addresses: function_search_path_mutable (5 functions), materialized_view_in_api
-- on server_signals, rls_policy_always_true on bumps.

-- 1. Lock function search_paths (prevents search_path manipulation attacks)
ALTER FUNCTION public.calculate_uptime(UUID, INT) SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.update_vote_count() SET search_path = '';
ALTER FUNCTION public.update_rating_avg() SET search_path = '';

-- 2. Revoke server_signals from public (service-role-only — ranking cron is the sole reader)
REVOKE SELECT ON public.server_signals FROM anon, authenticated;

-- 3. Tighten bumps INSERT RLS: authenticated users with matching user_id, or anon with null user_id
DROP POLICY IF EXISTS "Users can bump" ON bumps;
CREATE POLICY "Authenticated bumps own user_id" ON bumps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
-- Anonymous bumps allowed only with null user_id (rate-limited by IP in app layer).
CREATE POLICY "Anonymous bumps null user_id" ON bumps FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
