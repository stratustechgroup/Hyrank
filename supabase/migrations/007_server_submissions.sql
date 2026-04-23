-- server_submissions: staging table for user-submitted servers awaiting admin review.
-- Submissions are inserted by authenticated users and read/updated by admins.
CREATE TABLE IF NOT EXISTS public.server_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  ip           TEXT NOT NULL,
  description  TEXT,
  banner       TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  -- JSON snapshot of mods selected at submission time (curseforge mod list)
  mods         JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated users can insert their own submissions; can read their own.
ALTER TABLE public.server_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own submissions"
  ON public.server_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "Users can read own submissions"
  ON public.server_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = submitter_id);

-- Admins (service role / admin client) bypass RLS automatically.
-- No additional policy needed for admin reads/updates.
