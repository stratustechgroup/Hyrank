import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ServerAnalyticsPanel from "@/components/dashboard/ServerAnalyticsPanel";
import DashboardShell from "@/app/dashboard/DashboardShell";
import type { Server } from "@/lib/supabase/queries";

// Type alias matching the LegacyServerRow shape used in transformServer
type OwnedServerRow = {
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

function rowToServer(row: OwnedServerRow, rank: number): Server {
  const badges: Server["badges"] = [];
  if (row.verified) badges.push("verified");
  if (row.is_premium) badges.push("premium");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (new Date(row.created_at) > sevenDaysAgo) badges.push("new");

  return {
    id: row.id,
    rank,
    name: row.name,
    ip: row.ip,
    tags: row.tags || [],
    players: { online: row.players_online ?? 0, max: row.players_max ?? 0 },
    verified: row.verified ?? false,
    banner: row.banner || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
    description: row.description || "",
    featured: row.featured ?? false,
    featuredOrder: row.featured_order,
    createdAt: row.created_at,
    votes: row.vote_count ?? 0,
    website: row.website || undefined,
    discord: row.discord || undefined,
    ownerId: row.owner_id || undefined,
    status: row.status ?? "unknown",
    latency: row.latency || undefined,
    lastPing: row.last_ping || undefined,
    uptime: { day: row.uptime_day, week: row.uptime_week, month: row.uptime_month },
    icon: row.icon || undefined,
    motd: row.motd || undefined,
    banners: row.banners || undefined,
    twitter: row.twitter || undefined,
    youtube: row.youtube || undefined,
    rating: { average: Number(row.rating_avg) || 0, count: row.rating_count ?? 0 },
    monthlyVotes: row.monthly_votes ?? 0,
    weeklyVotes: row.weekly_votes ?? 0,
    viewCount: row.view_count ?? 0,
    clickCount: row.click_count ?? 0,
    isPremium: row.is_premium ?? false,
    country: row.country || undefined,
    badges,
  };
}

interface DailyMetric {
  date: string;
  votes: number;
  views: number;
  players: number;
}

async function getServerMetrics(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  serverId: string,
): Promise<DailyMetric[]> {
  if (!supabase) return [];

  // Pull last 14 days of server_status_history for player data
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const { data: history } = await supabase
    .from("server_status_history")
    .select("recorded_at, players_online")
    .eq("server_id", serverId)
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true });

  // Pull last 14 days of votes
  const { data: votes } = await supabase
    .from("votes")
    .select("created_at")
    .eq("server_id", serverId)
    .gte("created_at", since.toISOString());

  // Group by calendar day
  const dayMap = new Map<string, DailyMetric>();
  const pad = (v: number) => v.toString().padStart(2, "0");
  const toDay = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Fill in 14 days so charts don't have gaps
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    dayMap.set(key, { date: key, votes: 0, views: 0, players: 0 });
  }

  for (const row of history ?? []) {
    const day = toDay(row.recorded_at ?? "");
    const existing = dayMap.get(day);
    if (existing) {
      // Average players per day (update as we go; will divide later)
      existing.players = Math.max(existing.players, row.players_online ?? 0);
    }
  }

  for (const row of votes ?? []) {
    const day = toDay(row.created_at ?? "");
    const existing = dayMap.get(day);
    if (existing) existing.votes++;
  }

  return Array.from(dayMap.values());
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    // Shouldn't happen — middleware redirects unauthenticated requests
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Fetch servers owned by this user
  const { data: serverRows } = await supabase
    .from("servers")
    .select("*")
    .eq("owner_id", user.id)
    .order("vote_count", { ascending: false });

  const ownedServers: Server[] = ((serverRows ?? []) as unknown as OwnedServerRow[]).map(
    (row, i) => rowToServer(row, i + 1),
  );

  // Fetch per-server metrics in parallel
  const metricsPerServer = await Promise.all(
    ownedServers.map((s) => getServerMetrics(supabase, s.id)),
  );

  // Aggregate stats across all owned servers
  const totalVotes = ownedServers.reduce((s, srv) => s + srv.votes, 0);
  const totalPlayers = ownedServers.reduce((s, srv) => s + srv.players.online, 0);
  const featuredCount = ownedServers.filter((s) => s.featured).length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/60">Manage your servers and track performance</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Your Servers</div>
          <div className="text-2xl font-bold text-white">{ownedServers.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Total Players</div>
          <div className="text-2xl font-bold text-adventure-400 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-adventure-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-adventure-500" />
            </span>
            {totalPlayers.toLocaleString()}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Total Votes</div>
          <div className="text-2xl font-bold text-white">{totalVotes.toLocaleString()}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Featured Slots</div>
          <div className="text-2xl font-bold text-legendary-400">{featuredCount}</div>
        </div>
      </div>

      {/* Per-server analytics */}
      {ownedServers.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Your Servers</h2>
          {ownedServers.map((server, i) => (
            <ServerAnalyticsPanel
              key={server.id}
              server={server}
              metrics={metricsPerServer[i] ?? []}
              index={i}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="glass-card p-12 text-center">
          <div className="text-white/30 mb-6">
            <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No servers yet</h3>
          <p className="text-white/50 mb-2">
            You don&apos;t own any servers yet. Submit a server or claim an existing one.
          </p>
          <p className="text-white/30 text-sm mb-6">
            To claim a server you manage, visit its listing page and click &ldquo;Claim this server&rdquo;.
          </p>
          <DashboardShell />
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-adventure-500/20 flex items-center justify-center text-adventure-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-medium">Apply for Verification</div>
            <div className="text-white/40 text-sm">Get the verified badge</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-legendary-500/20 flex items-center justify-center text-legendary-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-medium">Get Featured</div>
            <div className="text-white/40 text-sm">Boost your visibility</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div>
            <div className="text-white font-medium">Help &amp; Support</div>
            <div className="text-white/40 text-sm">Get assistance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
