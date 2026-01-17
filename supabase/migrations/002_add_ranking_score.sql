-- Add ranking_score column for calculated server rankings
-- This score is updated by the calculate-rankings cron job

ALTER TABLE servers ADD COLUMN IF NOT EXISTS ranking_score DECIMAL(10,2) DEFAULT 0;

-- Add query_port for Nitrado query API
ALTER TABLE servers ADD COLUMN IF NOT EXISTS query_port INT DEFAULT 5523;

-- Create index for fast sorting by ranking
CREATE INDEX IF NOT EXISTS idx_servers_ranking_score ON servers(ranking_score DESC);

-- Create index for featured servers ordering
CREATE INDEX IF NOT EXISTS idx_servers_featured ON servers(featured, featured_order) WHERE featured = TRUE;

-- Create index for servers needing ping
CREATE INDEX IF NOT EXISTS idx_servers_last_ping ON servers(last_ping);
