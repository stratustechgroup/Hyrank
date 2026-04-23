import { createBrowserSupabaseClient } from "./client";
import type { Database } from "./types";

export type ServerRow = Database["public"]["Tables"]["servers"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

// TODO(plan-2): migrate transformServer to handle nullable generated columns.
// The generated database.types.ts makes many columns `| null` that the UI transform
// treats as non-null. This legacy alias preserves the pre-migration-003 non-null shape
// so the transform is unchanged. Plan 2 will add proper null-coalescing at read sites.
type LegacyServerRow = {
  id: string;
  name: string;
  ip: string;
  description: string | null;
  banner: string | null;
  banners: string[] | null;
  icon: string | null;
  motd: string | null;
  tags: string[];
  website: string | null;
  discord: string | null;
  twitter: string | null;
  youtube: string | null;
  owner_id: string | null;
  verified: boolean;
  featured: boolean;
  featured_order: number | null;
  players_online: number;
  players_max: number;
  status: "online" | "offline" | "unknown";
  latency: number | null;
  last_ping: string | null;
  uptime_day: number | null;
  uptime_week: number | null;
  uptime_month: number | null;
  vote_count: number;
  monthly_votes: number;
  weekly_votes: number;
  rating_avg: number;
  rating_count: number;
  view_count: number;
  click_count: number;
  votifier_enabled: boolean;
  votifier_ip: string | null;
  votifier_port: number;
  votifier_public_key: string | null;
  votifier_secret_key: string | null;
  is_premium: boolean;
  ranking_score: number;
  query_port: number;
  country: string | null;
  created_at: string;
  updated_at: string;
};

// Transform database row to frontend-compatible format
export interface Server {
  id: string;
  rank: number;
  name: string;
  ip: string;
  tags: string[];
  players: {
    online: number;
    max: number;
  };
  verified: boolean;
  banner: string;
  description: string;
  featured: boolean;
  featuredOrder: number | null;
  createdAt: string;
  votes: number;
  website?: string;
  discord?: string;
  ownerId?: string;
  status: "online" | "offline" | "unknown";
  latency?: number;
  lastPing?: string;
  uptime: {
    day: number | null;
    week: number | null;
    month: number | null;
  };
  icon?: string;
  motd?: string;
  banners?: string[];
  trailer?: string;
  twitter?: string;
  youtube?: string;
  rating: {
    average: number;
    count: number;
  };
  monthlyVotes: number;
  weeklyVotes: number;
  viewCount: number;
  clickCount: number;
  isPremium: boolean;
  lastBump?: string;
  country?: string;
  badges: ("verified" | "premium" | "new" | "trending" | "staff-pick")[];
}

// Transform database row to Server interface
function transformServer(row: LegacyServerRow, rank: number): Server {
  const badges: Server["badges"] = [];
  if (row.verified) badges.push("verified");
  if (row.is_premium) badges.push("premium");

  // "new" if created within last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (new Date(row.created_at) > sevenDaysAgo) badges.push("new");

  // "trending" if weekly votes are high relative to total
  if (row.weekly_votes > 100 || (row.vote_count > 0 && row.weekly_votes / row.vote_count > 0.3)) {
    badges.push("trending");
  }

  return {
    id: row.id,
    rank,
    name: row.name,
    ip: row.ip,
    tags: row.tags || [],
    players: {
      online: row.players_online,
      max: row.players_max,
    },
    verified: row.verified,
    banner: row.banner || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
    description: row.description || "",
    featured: row.featured,
    featuredOrder: row.featured_order,
    createdAt: row.created_at,
    votes: row.vote_count,
    website: row.website || undefined,
    discord: row.discord || undefined,
    ownerId: row.owner_id || undefined,
    status: row.status,
    latency: row.latency || undefined,
    lastPing: row.last_ping || undefined,
    uptime: {
      day: row.uptime_day,
      week: row.uptime_week,
      month: row.uptime_month,
    },
    icon: row.icon || undefined,
    motd: row.motd || undefined,
    banners: row.banners || undefined,
    twitter: row.twitter || undefined,
    youtube: row.youtube || undefined,
    rating: {
      average: Number(row.rating_avg) || 0,
      count: row.rating_count,
    },
    monthlyVotes: row.monthly_votes,
    weeklyVotes: row.weekly_votes,
    viewCount: row.view_count,
    clickCount: row.click_count,
    isPremium: row.is_premium,
    country: row.country || undefined,
    badges,
  };
}

// Get all servers with ranking
export async function getServers(options?: {
  sortBy?: "rank" | "votes" | "players" | "newest" | "name";
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<{ servers: Server[]; total: number }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return { servers: [], total: 0 };
  }

  let query = supabase.from("servers").select("*", { count: "exact" });

  // Filter by tag
  if (options?.tag) {
    query = query.contains("tags", [options.tag]);
  }

  // Sort
  switch (options?.sortBy) {
    case "votes":
      query = query.order("vote_count", { ascending: false });
      break;
    case "players":
      query = query.order("players_online", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      // Default rank by vote_count
      query = query.order("vote_count", { ascending: false });
  }

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching servers:", error);
    return { servers: [], total: 0 };
  }

  const servers = ((data || []) as unknown as LegacyServerRow[]).map((row, index) =>
    transformServer(row, (options?.offset || 0) + index + 1)
  );

  return { servers, total: count || 0 };
}

// Get featured servers
export async function getFeaturedServers(): Promise<Server[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .eq("featured", true)
    .not("featured_order", "is", null)
    .order("featured_order", { ascending: true })
    .limit(6);

  if (error) {
    console.error("Error fetching featured servers:", error);
    return [];
  }

  return ((data || []) as unknown as LegacyServerRow[]).map((row, index) => transformServer(row, index + 1));
}

// Get top voted servers
export async function getTopVotedServers(limit: number = 10): Promise<Server[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .order("vote_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching top voted servers:", error);
    return [];
  }

  return ((data || []) as unknown as LegacyServerRow[]).map((row, index) => transformServer(row, index + 1));
}

// Get recently added servers
export async function getRecentServers(limit: number = 6): Promise<Server[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent servers:", error);
    return [];
  }

  return ((data || []) as unknown as LegacyServerRow[]).map((row, index) => transformServer(row, index + 1));
}

// Get servers by tag
export async function getServersByTag(tag: string): Promise<Server[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .contains("tags", [tag])
    .order("vote_count", { ascending: false });

  if (error) {
    console.error("Error fetching servers by tag:", error);
    return [];
  }

  return ((data || []) as unknown as LegacyServerRow[]).map((row, index) => transformServer(row, index + 1));
}

// Get single server by ID
export async function getServerById(id: string): Promise<Server | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching server:", error);
    return null;
  }

  const serverData = data as unknown as LegacyServerRow;

  // Get rank by counting servers with more votes
  const { count } = await supabase
    .from("servers")
    .select("*", { count: "exact", head: true })
    .gt("vote_count", serverData.vote_count);

  return transformServer(serverData, (count || 0) + 1);
}

// Get total player count across all servers
export async function getTotalPlayers(): Promise<number> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase
    .from("servers")
    .select("players_online");

  if (error) {
    console.error("Error fetching total players:", error);
    return 0;
  }

  const rows = data as { players_online: number }[] | null;
  return (rows || []).reduce((sum, row) => sum + (row.players_online || 0), 0);
}

// Get server count
export async function getServerCount(): Promise<number> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from("servers")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching server count:", error);
    return 0;
  }

  return count || 0;
}

// Get tag counts
export async function getTagCounts(): Promise<Record<string, number>> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return {};
  }

  const { data, error } = await supabase.from("servers").select("tags");

  if (error) {
    console.error("Error fetching tag counts:", error);
    return {};
  }

  const rows = data as { tags: string[] | null }[] | null;
  const counts: Record<string, number> = {};
  (rows || []).forEach((row) => {
    (row.tags || []).forEach((tag: string) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });

  return counts;
}

// Increment view count
export async function incrementViewCount(serverId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return;

  // Custom RPC functions don't have generated types
  const rpc = supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<unknown>;
  await rpc("increment_view_count", { server_id: serverId });
}

// Increment click count (for IP copy)
export async function incrementClickCount(serverId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return;

  // Custom RPC functions don't have generated types
  const rpc = supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<unknown>;
  await rpc("increment_click_count", { server_id: serverId });
}

// Get random server
export async function getRandomServer(): Promise<Server | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return null;
  }

  // Get total count first
  const { count } = await supabase
    .from("servers")
    .select("*", { count: "exact", head: true });

  if (!count || count === 0) return null;

  // Get random offset
  const randomOffset = Math.floor(Math.random() * count);

  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .range(randomOffset, randomOffset)
    .single();

  if (error || !data) {
    console.error("Error fetching random server:", error);
    return null;
  }

  return transformServer(data as unknown as LegacyServerRow, randomOffset + 1);
}

// Search servers
export async function searchServers(query: string): Promise<Server[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,ip.ilike.%${query}%`)
    .order("vote_count", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error searching servers:", error);
    return [];
  }

  return ((data || []) as unknown as LegacyServerRow[]).map((row, index) => transformServer(row, index + 1));
}
