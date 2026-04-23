import type { Database } from "./database.types";
import { createServerSupabaseClient } from "./server";
import type { Server } from "./queries";

type Gamemode = Database["public"]["Tables"]["gamemodes"]["Row"];

// Supabase typed client does not include gamemodes/server_gamemodes in its union yet.
// We use a local `q` helper cast to bypass type-narrowing on a per-call basis.
// This is the same pattern used by the cron edge function (KNOWN_ISSUES.md).
type LooseClient = { from: (t: string) => LooseQuery };
type LooseQuery = {
  select: (cols: string) => LooseQuery;
  eq: (col: string, val: unknown) => LooseQuery;
  neq: (col: string, val: string) => LooseQuery;
  in: (col: string, vals: string[]) => LooseQuery;
  order: (col: string, opts?: object) => LooseQuery;
  limit: (n: number) => LooseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  then: Promise<{ data: unknown; error: unknown }>["then"];
};

function asLoose(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
): LooseClient {
  return supabase as unknown as LooseClient;
}

/** Returns the 14 seeded gamemodes sorted by sort_order ASC. */
export async function getAllGamemodes(): Promise<Gamemode[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const q = asLoose(supabase);
  const { data, error } = (await (q
    .from("gamemodes")
    .select("*")
    .order("sort_order", { ascending: true }) as unknown as Promise<{
    data: Gamemode[] | null;
    error: unknown;
  }>));
  if (error || !data) return [];
  return data;
}

/** Returns a gamemode by slug, or null. */
export async function getGamemodeBySlug(slug: string): Promise<Gamemode | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const q = asLoose(supabase);
  const { data } = (await (q
    .from("gamemodes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle() as unknown as Promise<{ data: Gamemode | null }>));
  return data ?? null;
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
  const q = asLoose(supabase);

  // Step 1: resolve gamemode id
  const gmResult = (await (q
    .from("gamemodes")
    .select("id")
    .eq("slug", slug)
    .maybeSingle() as unknown as Promise<{ data: { id: string } | null }>));
  if (!gmResult.data) return [];
  const gamemodeId = gmResult.data.id;

  // Step 2: get server ids for this gamemode
  const joinsResult = (await (q
    .from("server_gamemodes")
    .select("server_id")
    .eq("gamemode_id", gamemodeId)
    .limit(500) as unknown as Promise<{ data: { server_id: string }[] | null }>));
  const serverIds = (joinsResult.data ?? []).map((j) => j.server_id);
  if (serverIds.length === 0) return [];

  // Step 3: fetch and transform servers
  const serversResult = (await (q
    .from("servers")
    .select("*")
    .in("id", serverIds)
    .neq("status", "banned")
    .order("ranking_score", { ascending: false, nullsFirst: false })
    .limit(limit) as unknown as Promise<{ data: RawServerRow[] | null }>));

  return (serversResult.data ?? []).map((row, index) =>
    transformRawServer(row, index + 1),
  );
}

/** Count of servers for each gamemode slug — used on the /gamemodes index. */
export async function getGamemodeServerCounts(): Promise<Record<string, number>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};
  const q = asLoose(supabase);
  const result = (await (q
    .from("server_gamemodes")
    .select("gamemode_id, gamemodes!inner(slug)")
    .limit(10000) as unknown as Promise<{
    data: { gamemode_id: string; gamemodes: { slug: string } }[] | null;
  }>));
  const out: Record<string, number> = {};
  for (const row of result.data ?? []) {
    out[row.gamemodes.slug] = (out[row.gamemodes.slug] ?? 0) + 1;
  }
  return out;
}
