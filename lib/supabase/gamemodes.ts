import type { Database } from "./database.types";
import { createServerSupabaseClient } from "./server";
import type { Server } from "./queries";

type Gamemode = Database["public"]["Tables"]["gamemodes"]["Row"];

/** Returns the 14 seeded gamemodes sorted by sort_order ASC. */
export async function getAllGamemodes(): Promise<Gamemode[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("gamemodes")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as Gamemode[];
}

/** Returns a gamemode by slug, or null. */
export async function getGamemodeBySlug(slug: string): Promise<Gamemode | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("gamemodes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data ?? null) as Gamemode | null;
}

/** Minimal raw row shape used for internal transform only. */
type RawServerRow = {
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
  is_premium: boolean;
  ranking_score: number;
  country: string | null;
  created_at: string;
  updated_at: string;
  trust_tier: string | null;
};

function transformRawServer(row: RawServerRow, rank: number): Server {
  const badges: Server["badges"] = [];
  if (row.verified) badges.push("verified");
  if (row.is_premium) badges.push("premium");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (new Date(row.created_at) > sevenDaysAgo) badges.push("new");

  if (
    row.weekly_votes > 100 ||
    (row.vote_count > 0 && row.weekly_votes / row.vote_count > 0.3)
  ) {
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
    banner:
      row.banner ||
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
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
    // trust_tier is not part of the frontend Server type; stored on DB row only
  };
}

/**
 * Servers that have this gamemode in their server_gamemodes join.
 * Sorted by servers.ranking_score DESC.
 * Returns transformed Server[] ready for ServerCard/ServerListItem.
 */
export async function getServersByGamemodeSlug(
  slug: string,
  opts: { limit?: number } = {},
): Promise<Server[]> {
  const { limit = 50 } = opts;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  // Step 1: resolve gamemode id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gm } = await (supabase as any)
    .from("gamemodes")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!gm) return [];

  // Step 2: get server ids for this gamemode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: joins } = await (supabase as any)
    .from("server_gamemodes")
    .select("server_id")
    .eq("gamemode_id", gm.id)
    .limit(500);
  const serverIds = (joins ?? []).map((j: { server_id: string }) => j.server_id);
  if (serverIds.length === 0) return [];

  // Step 3: fetch and transform servers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: servers } = await (supabase as any)
    .from("servers")
    .select("*")
    .in("id", serverIds)
    .neq("status", "banned")
    .order("ranking_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  return ((servers ?? []) as RawServerRow[]).map((row, index) =>
    transformRawServer(row, index + 1),
  );
}

/** Count of servers for each gamemode slug — used on the /gamemodes index. */
export async function getGamemodeServerCounts(): Promise<Record<string, number>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("server_gamemodes")
    .select("gamemode_id, gamemodes!inner(slug)");
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { gamemode_id: string; gamemodes: { slug: string } }[]) {
    out[row.gamemodes.slug] = (out[row.gamemodes.slug] ?? 0) + 1;
  }
  return out;
}
