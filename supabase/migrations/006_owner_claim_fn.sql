-- Helper function: mark a server_owners claim verified if the server's current
-- MOTD contains the token. Called from the ping-servers cron after each poll.
-- Returns the number of claims verified in this invocation.
CREATE OR REPLACE FUNCTION public.verify_pending_motd_claims(p_server_id UUID, p_motd TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id, user_id, token
    FROM public.server_owners
    WHERE server_id = p_server_id
      AND method = 'motd'
      AND status = 'pending'
      AND p_motd ILIKE '%' || token || '%'
    LIMIT 5
  LOOP
    UPDATE public.server_owners
       SET status = 'verified', verified_at = NOW()
     WHERE id = v_row.id;

    UPDATE public.servers
       SET owner_id = v_row.user_id,
           trust_tier = 'claimed'
     WHERE id = p_server_id AND owner_id IS NULL;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
