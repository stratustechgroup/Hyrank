-- HyRank Initial Schema
-- Run this on your Supabase SQL editor to set up the database

-- =============================================================================
-- SERVERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ip TEXT NOT NULL UNIQUE,
  description TEXT,
  banner TEXT,
  banners TEXT[],
  icon TEXT,
  motd TEXT,
  tags TEXT[] DEFAULT '{}',
  website TEXT,
  discord TEXT,
  twitter TEXT,
  youtube TEXT,

  -- Ownership
  owner_id UUID REFERENCES auth.users(id),
  verified BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  featured_order INT,

  -- Server Status (updated by cron)
  players_online INT DEFAULT 0,
  players_max INT DEFAULT 0,
  status TEXT DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
  latency INT,
  last_ping TIMESTAMPTZ,
  uptime_day DECIMAL(5,2),
  uptime_week DECIMAL(5,2),
  uptime_month DECIMAL(5,2),

  -- Aggregates
  vote_count INT DEFAULT 0,
  monthly_votes INT DEFAULT 0,
  weekly_votes INT DEFAULT 0,
  rating_avg DECIMAL(2,1) DEFAULT 0,
  rating_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  click_count INT DEFAULT 0,

  -- Votifier Configuration
  votifier_enabled BOOLEAN DEFAULT FALSE,
  votifier_ip TEXT,
  votifier_port INT DEFAULT 8192,
  votifier_public_key TEXT,
  votifier_secret_key UUID DEFAULT gen_random_uuid(),
  votifier_last_test TIMESTAMPTZ,
  votifier_last_test_success BOOLEAN,

  -- Premium
  is_premium BOOLEAN DEFAULT FALSE,
  last_bump TIMESTAMPTZ,
  bump_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SERVER STATUS HISTORY (for graphs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS server_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  players_online INT,
  status TEXT,
  latency INT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_server_status_history_server_id ON server_status_history(server_id);
CREATE INDEX idx_server_status_history_recorded_at ON server_status_history(recorded_at);

-- =============================================================================
-- VOTES
-- =============================================================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  ip_hash TEXT NOT NULL,
  visitor_id TEXT, -- Browser fingerprint
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_votes_server_id ON votes(server_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_ip_hash ON votes(ip_hash);
CREATE INDEX idx_votes_created_at ON votes(created_at);

-- =============================================================================
-- VOTE DELIVERIES (Votifier notification tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS vote_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'claimed')),
  attempts INT DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  next_retry TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vote_deliveries_status ON vote_deliveries(status);
CREATE INDEX idx_vote_deliveries_next_retry ON vote_deliveries(next_retry);

-- =============================================================================
-- REVIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  helpful_count INT DEFAULT 0,
  reported BOOLEAN DEFAULT FALSE,
  owner_response TEXT,
  owner_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(server_id, user_id)
);

CREATE INDEX idx_reviews_server_id ON reviews(server_id);

-- =============================================================================
-- USER PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,

  -- Verification levels
  email_verified BOOLEAN DEFAULT FALSE,
  discord_id TEXT,
  discord_username TEXT,
  hytale_uuid TEXT,
  hytale_username TEXT,
  hytale_verified_at TIMESTAMPTZ,

  -- Anti-manipulation
  ip_addresses TEXT[],
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,

  -- Stats
  total_votes INT DEFAULT 0,
  vote_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_hytale_uuid ON profiles(hytale_uuid);
CREATE INDEX idx_profiles_discord_id ON profiles(discord_id);

-- =============================================================================
-- SAVED SERVERS (Favorites)
-- =============================================================================
CREATE TABLE IF NOT EXISTS saved_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, server_id)
);

-- =============================================================================
-- BUMPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS bumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  ip_hash TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  bumped_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_bumps_server_id ON bumps(server_id);
CREATE INDEX idx_bumps_expires_at ON bumps(expires_at);

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- =============================================================================
-- FEATURED AUCTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS featured_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INT NOT NULL CHECK (position >= 1 AND position <= 6),
  server_id UUID REFERENCES servers(id),
  bidder_id UUID REFERENCES auth.users(id),
  bid_amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Servers: Anyone can read, owners can update their own
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Servers are viewable by everyone" ON servers FOR SELECT USING (true);
CREATE POLICY "Owners can update own servers" ON servers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated users can insert servers" ON servers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Server Status History: Anyone can read
ALTER TABLE server_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status history is viewable by everyone" ON server_status_history FOR SELECT USING (true);

-- Votes: Anyone can read, authenticated users can insert
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are viewable by everyone" ON votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON votes FOR INSERT WITH CHECK (true);

-- Vote Deliveries: Server owners can read their own
ALTER TABLE vote_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view vote deliveries" ON vote_deliveries FOR SELECT
  USING (EXISTS (SELECT 1 FROM servers WHERE servers.id = vote_deliveries.server_id AND servers.owner_id = auth.uid()));

-- Reviews: Anyone can read, authenticated users can insert/update their own
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);

-- Profiles: Users can read all, update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Saved Servers: Users can only see their own
ALTER TABLE saved_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saved servers" ON saved_servers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save servers" ON saved_servers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave servers" ON saved_servers FOR DELETE USING (auth.uid() = user_id);

-- Bumps: Anyone can read, authenticated users can create
ALTER TABLE bumps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bumps are viewable by everyone" ON bumps FOR SELECT USING (true);
CREATE POLICY "Users can bump" ON bumps FOR INSERT WITH CHECK (true);

-- Subscriptions: Users can only see their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Featured Auctions: Anyone can read
ALTER TABLE featured_auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auctions are viewable by everyone" ON featured_auctions FOR SELECT USING (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate uptime percentage
CREATE OR REPLACE FUNCTION calculate_uptime(server_uuid UUID, hours INT)
RETURNS DECIMAL AS $$
DECLARE
  total_pings INT;
  online_pings INT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'online')
  INTO total_pings, online_pings
  FROM server_status_history
  WHERE server_id = server_uuid
    AND recorded_at > NOW() - (hours || ' hours')::INTERVAL;

  IF total_pings = 0 THEN RETURN NULL; END IF;
  RETURN ROUND((online_pings::DECIMAL / total_pings) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Update server timestamps on update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON servers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email_verified)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.email_confirmed_at IS NOT NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update vote count on server when vote is cast
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE servers
  SET
    vote_count = vote_count + 1,
    monthly_votes = (
      SELECT COUNT(*) FROM votes
      WHERE server_id = NEW.server_id
      AND created_at > NOW() - INTERVAL '30 days'
    ),
    weekly_votes = (
      SELECT COUNT(*) FROM votes
      WHERE server_id = NEW.server_id
      AND created_at > NOW() - INTERVAL '7 days'
    )
  WHERE id = NEW.server_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_vote_created
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_count();

-- Update rating average on review change
CREATE OR REPLACE FUNCTION update_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE servers
  SET
    rating_avg = (
      SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE server_id = COALESCE(NEW.server_id, OLD.server_id)
    ),
    rating_count = (
      SELECT COUNT(*) FROM reviews WHERE server_id = COALESCE(NEW.server_id, OLD.server_id)
    )
  WHERE id = COALESCE(NEW.server_id, OLD.server_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_avg();
