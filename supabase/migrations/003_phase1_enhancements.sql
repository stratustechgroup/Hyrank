-- =============================================================================
-- 003 -- Phase 1 enhancements
-- Applied to project uosmhbirchjudpwtptov (hyrank) on 2026-04-22 via Supabase MCP.
-- Conservative: ADD COLUMN / CREATE TABLE / CREATE INDEX.
-- Replaces insecure votes INSERT policy (`WITH CHECK (true)` → `WITH CHECK (false)`).
-- Updates the update_vote_count trigger to ignore shadow-invalidated rows.
-- =============================================================================

-- 1. profiles.trust_tier + updated_at
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trust_tier TEXT NOT NULL DEFAULT 'unverified'
    CHECK (trust_tier IN ('unverified','claimed','verified','partner','banned')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_trust_tier ON profiles(trust_tier);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. servers: slug, port, trust_tier, live/ping supplements
ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS port INT,
  ADD COLUMN IF NOT EXISTS trust_tier TEXT NOT NULL DEFAULT 'unverified'
    CHECK (trust_tier IN ('unverified','claimed','verified','partner','banned')),
  ADD COLUMN IF NOT EXISTS last_seen_online TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offline_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT;

UPDATE servers SET trust_tier = 'verified'
  WHERE verified = TRUE AND trust_tier = 'unverified';

UPDATE servers
SET slug = LOWER(REGEXP_REPLACE(COALESCE(name, id::text), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_slug ON servers(slug);
CREATE INDEX IF NOT EXISTS idx_servers_trust_tier ON servers(trust_tier);

-- 3. gamemodes + seed 14
CREATE TABLE IF NOT EXISTS gamemodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gamemodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gamemodes are viewable by everyone" ON gamemodes;
CREATE POLICY "Gamemodes are viewable by everyone" ON gamemodes FOR SELECT USING (true);

INSERT INTO gamemodes (slug, name, sort_order) VALUES
  ('survival','Survival',10),('pvp','PvP',20),('smp','SMP',30),('factions','Factions',40),
  ('skyblock','Skyblock',50),('mmorpg','MMORPG',60),('towny','Towny',70),('creative','Creative',80),
  ('roleplay','Roleplay',90),('anarchy','Anarchy',100),('minigames','Minigames',110),
  ('modded','Modded',120),('hardcore','Hardcore',130),('adventure','Adventure',140)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS server_gamemodes (
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  gamemode_id UUID NOT NULL REFERENCES gamemodes(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (server_id, gamemode_id)
);
CREATE INDEX IF NOT EXISTS idx_server_gamemodes_gamemode ON server_gamemodes(gamemode_id);

ALTER TABLE server_gamemodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server-gamemodes readable by everyone" ON server_gamemodes;
CREATE POLICY "Server-gamemodes readable by everyone" ON server_gamemodes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners manage own server gamemodes" ON server_gamemodes;
CREATE POLICY "Owners manage own server gamemodes" ON server_gamemodes FOR ALL
  USING (EXISTS (SELECT 1 FROM servers s WHERE s.id = server_gamemodes.server_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM servers s WHERE s.id = server_gamemodes.server_id AND s.owner_id = auth.uid()));

-- Best-effort backfill from legacy servers.tags[] -> server_gamemodes
INSERT INTO server_gamemodes (server_id, gamemode_id, is_primary)
SELECT s.id, g.id, FALSE
FROM servers s
CROSS JOIN LATERAL unnest(s.tags) AS t(tag)
JOIN gamemodes g ON g.slug = LOWER(t.tag)
ON CONFLICT DO NOTHING;

-- 4. tags canonical table + join
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tags readable by everyone" ON tags;
CREATE POLICY "Tags readable by everyone" ON tags FOR SELECT USING (approved = true);
DROP POLICY IF EXISTS "Authenticated users propose tags" ON tags;
CREATE POLICY "Authenticated users propose tags" ON tags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND approved = false AND created_by = auth.uid());

INSERT INTO tags (slug, name, approved) VALUES
  ('cross-region','Cross-Region',true),
  ('family-friendly','Family-Friendly',true),
  ('no-pay-to-win','No Pay-to-Win',true),
  ('economy','Economy',true),
  ('quests','Quests',true),
  ('custom-items','Custom Items',true),
  ('daily-events','Daily Events',true),
  ('small-community','Small Community',true),
  ('large-network','Large Network',true)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS server_tags (
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (server_id, tag_id)
);
ALTER TABLE server_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server-tags readable by everyone" ON server_tags;
CREATE POLICY "Server-tags readable by everyone" ON server_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners manage own server tags" ON server_tags;
CREATE POLICY "Owners manage own server tags" ON server_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM servers s WHERE s.id = server_tags.server_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM servers s WHERE s.id = server_tags.server_id AND s.owner_id = auth.uid()));

-- 5. votes: status + anti-fraud columns + IMMUTABLE-compliant vote_bucket + unique index
ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid','shadow_invalidated','verified','pending_validation')),
  ADD COLUMN IF NOT EXISTS ua_hash TEXT,
  ADD COLUMN IF NOT EXISTS trust_score INT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vote_bucket BIGINT
    GENERATED ALWAYS AS (
      FLOOR(EXTRACT(EPOCH FROM (created_at AT TIME ZONE 'UTC')) / 43200)::BIGINT
    ) STORED;

-- 12-hour cooldown enforced at DB layer for logged-in valid/verified votes.
-- Race-condition-proof via partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_cooldown_user
  ON votes(server_id, user_id, vote_bucket)
  WHERE status IN ('valid','verified') AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_votes_visitor_bucket
  ON votes(server_id, visitor_id, vote_bucket) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_status ON votes(status);

-- Tighten INSERT: move all writes to service-role Edge Function.
DROP POLICY IF EXISTS "Users can vote" ON votes;
DROP POLICY IF EXISTS "Votes insert disabled for non-service-role" ON votes;
CREATE POLICY "Votes insert disabled for non-service-role" ON votes
  FOR INSERT WITH CHECK (false);

-- Update vote-count trigger: only count valid/verified; shadow rows don't inflate.
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('valid','verified') THEN
    UPDATE servers
    SET
      vote_count = vote_count + 1,
      monthly_votes = (
        SELECT COUNT(*) FROM votes
        WHERE server_id = NEW.server_id
        AND status IN ('valid','verified')
        AND created_at > NOW() - INTERVAL '30 days'
      ),
      weekly_votes = (
        SELECT COUNT(*) FROM votes
        WHERE server_id = NEW.server_id
        AND status IN ('valid','verified')
        AND created_at > NOW() - INTERVAL '7 days'
      )
    WHERE id = NEW.server_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. server_owners (claim records)
CREATE TABLE IF NOT EXISTS server_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('motd','ingame','manual')),
  token TEXT NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','disputed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_server_owners_server ON server_owners(server_id, status);
CREATE INDEX IF NOT EXISTS idx_server_owners_user ON server_owners(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_server_owners_verified_once
  ON server_owners(server_id) WHERE verified_at IS NOT NULL;

ALTER TABLE server_owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Claimant can see own claims" ON server_owners;
CREATE POLICY "Claimant can see own claims" ON server_owners FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Claimant can create own claim" ON server_owners;
CREATE POLICY "Claimant can create own claim" ON server_owners FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. server_mods (CurseForge)
CREATE TABLE IF NOT EXISTS server_mods (
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  curseforge_mod_id BIGINT NOT NULL,
  declared_by TEXT NOT NULL DEFAULT 'owner'
    CHECK (declared_by IN ('owner','auto','admin')),
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (server_id, curseforge_mod_id)
);
CREATE INDEX IF NOT EXISTS idx_server_mods_mod ON server_mods(curseforge_mod_id);

ALTER TABLE server_mods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server mods readable by everyone" ON server_mods;
CREATE POLICY "Server mods readable by everyone" ON server_mods FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners manage own server mods" ON server_mods;
CREATE POLICY "Owners manage own server mods" ON server_mods FOR ALL
  USING (EXISTS (SELECT 1 FROM servers s WHERE s.id = server_mods.server_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM servers s WHERE s.id = server_mods.server_id AND s.owner_id = auth.uid()));

-- 8. moderation_log (public-read)
CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('server','user','vote','system')),
  subject_id UUID,
  subject_id_hash TEXT,
  reason TEXT,
  quantity INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moderation_log_created ON moderation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_log_subject ON moderation_log(subject_type, subject_id);

ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderation log readable by everyone" ON moderation_log;
CREATE POLICY "Moderation log readable by everyone" ON moderation_log FOR SELECT USING (true);

-- 9. server_signals materialized view + server_rank
CREATE MATERIALIZED VIEW IF NOT EXISTS server_signals AS
SELECT
  s.id AS server_id,
  COALESCE(s.rating_avg, 0) AS rating_avg,
  COALESCE(s.rating_count, 0) AS rating_count,
  (SELECT COUNT(*) FROM votes v
     WHERE v.server_id = s.id AND v.status IN ('valid','verified')
       AND v.created_at > NOW() - INTERVAL '7 days') AS valid_votes_7d,
  (SELECT COUNT(*) FROM votes v
     WHERE v.server_id = s.id AND v.status = 'shadow_invalidated'
       AND v.created_at > NOW() - INTERVAL '7 days') AS shadow_votes_7d,
  (SELECT MIN(v.created_at) FROM votes v
     WHERE v.server_id = s.id AND v.status IN ('valid','verified')
       AND v.created_at > NOW() - INTERVAL '7 days') AS first_vote_7d,
  s.players_online AS live_players,
  s.uptime_month AS uptime_30d,
  NOW() AS refreshed_at
FROM servers s;

CREATE UNIQUE INDEX IF NOT EXISTS uq_server_signals_server_id ON server_signals(server_id);

CREATE TABLE IF NOT EXISTS server_rank (
  server_id UUID PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
  composite_score DECIMAL(10,4) NOT NULL DEFAULT 0,
  bayesian_quality DECIMAL(10,4),
  hot_velocity DECIMAL(10,4),
  live_signal DECIMAL(10,4),
  retention DECIMAL(10,4),
  uptime_signal DECIMAL(10,4),
  shadow_fraud_penalty DECIMAL(10,4),
  computed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_server_rank_composite ON server_rank(composite_score DESC);

ALTER TABLE server_rank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server ranks readable by everyone" ON server_rank;
CREATE POLICY "Server ranks readable by everyone" ON server_rank FOR SELECT USING (true);
