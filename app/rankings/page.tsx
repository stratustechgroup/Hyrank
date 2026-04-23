import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateRankingsMetadata } from "@/lib/seo/metadata";
import ServerListItem from "@/components/server/ServerListItem";
import ServerCard from "@/components/ServerCard";
import RankingFilters from "./RankingFilters";

export const metadata: Metadata = generateRankingsMetadata();
export const revalidate = 60;

const PAGE_SIZE = 30;

// Tags shown in the filter bar (same list as original)
const ALL_TAGS = [
  "SMP", "RPG", "Minigames", "Factions", "Creative",
  "PvP", "Economy", "Survival", "Adventure", "Hardcore",
];

// Raw row shape for the server-side query
type RawRow = {
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
};

import type { Server } from "@/lib/supabase/queries";

function transformRow(row: RawRow, rank: number): Server {
  const badges: Server["badges"] = [];
  if (row.verified) badges.push("verified");
  if (row.is_premium) badges.push("premium");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (new Date(row.created_at) > sevenDaysAgo) badges.push("new");
  if (row.weekly_votes > 100 || (row.vote_count > 0 && row.weekly_votes / row.vote_count > 0.3)) {
    badges.push("trending");
  }
  return {
    id: row.id,
    rank,
    name: row.name,
    ip: row.ip,
    tags: row.tags || [],
    players: { online: row.players_online, max: row.players_max },
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
    uptime: { day: row.uptime_day, week: row.uptime_week, month: row.uptime_month },
    icon: row.icon || undefined,
    motd: row.motd || undefined,
    banners: row.banners || undefined,
    twitter: row.twitter || undefined,
    youtube: row.youtube || undefined,
    rating: { average: Number(row.rating_avg) || 0, count: row.rating_count },
    monthlyVotes: row.monthly_votes,
    weeklyVotes: row.weekly_votes,
    viewCount: row.view_count,
    clickCount: row.click_count,
    isPremium: row.is_premium,
    country: row.country || undefined,
    badges,
  };
}

interface SearchParams {
  search?: string;
  tag?: string;
  sort?: string;
  verified?: string;
  view?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function RankingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search?.trim() || "";
  const tag = params.tag || "";
  const sort = params.sort || "rank";
  const verifiedOnly = params.verified === "1";
  const view = params.view === "grid" ? "grid" : "list";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let servers: Server[] = [];
  let totalCount = 0;

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    // Build query — cast to loose client for dynamic column filters
    type AnyBuilder = {
      select: (cols: string, opts?: object) => AnyBuilder;
      ilike: (col: string, val: string) => AnyBuilder;
      contains: (col: string, val: unknown) => AnyBuilder;
      eq: (col: string, val: unknown) => AnyBuilder;
      order: (col: string, opts?: object) => AnyBuilder;
      range: (from: number, to: number) => AnyBuilder;
      then: Promise<{ data: unknown[]; error: unknown; count: number | null }>["then"];
    };

    let q = (supabase as unknown as { from: (t: string) => AnyBuilder })
      .from("servers")
      .select("*", { count: "exact" }) as AnyBuilder;

    // Search filter
    if (search) {
      const safe = search.replace(/[,():]/g, "").slice(0, 100);
      const pattern = `%${safe}%`;
      q = q.ilike("name", pattern);
    }

    // Tag filter
    if (tag) {
      q = q.contains("tags", [tag]);
    }

    // Verified filter
    if (verifiedOnly) {
      q = q.eq("verified", true);
    }

    // Sort
    switch (sort) {
      case "players":
        q = q.order("players_online", { ascending: false });
        break;
      case "votes":
        q = q.order("vote_count", { ascending: false });
        break;
      case "newest":
        q = q.order("created_at", { ascending: false });
        break;
      case "name":
        q = q.order("name", { ascending: true });
        break;
      default:
        // "rank" — use ranking_score from server_rank or fallback to vote_count
        q = q.order("ranking_score", { ascending: false });
        break;
    }

    // Paginate
    q = q.range(offset, offset + PAGE_SIZE - 1);

    const { data, error, count } = (await (q as unknown as Promise<{
      data: RawRow[] | null;
      error: unknown;
      count: number | null;
    }>));

    if (!error && data) {
      servers = data.map((row, i) => transformRow(row, offset + i + 1));
      totalCount = count ?? 0;
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Build URL helper for pagination links
  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (tag) sp.set("tag", tag);
    if (sort && sort !== "rank") sp.set("sort", sort);
    if (verifiedOnly) sp.set("verified", "1");
    if (view === "grid") sp.set("view", "grid");
    sp.set("page", String(p));
    return `/rankings?${sp.toString()}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="badge-teal">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            Rankings
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
          Server Rankings
        </h1>
        <p className="text-lg text-white/50">
          Browse and compare all {totalCount.toLocaleString()} servers in the Hytale universe
        </p>
      </div>

      {/* Filter bar — client component handles URL updates */}
      <RankingFilters
        allTags={ALL_TAGS}
        search={search}
        tag={tag}
        sort={sort}
        verifiedOnly={verifiedOnly}
        view={view}
      />

      {/* Results count + view toggle info */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/40 text-sm">
          Showing{" "}
          <span className="text-white/70 font-medium">{servers.length}</span> of{" "}
          <span className="text-white/70 font-medium">{totalCount.toLocaleString()}</span> servers
          {(search || tag || verifiedOnly) && (
            <span className="ml-2 badge-teal">filtered</span>
          )}
        </p>
        {totalPages > 1 && (
          <p className="text-white/40 text-sm">
            Page <span className="text-white/70 font-medium">{page}</span> of{" "}
            <span className="text-white/70 font-medium">{totalPages}</span>
          </p>
        )}
      </div>

      {/* Server list / grid */}
      {view === "list" ? (
        <div className="space-y-3">
          {servers.length > 0 ? (
            servers.map((server, index) => (
              <ServerListItem key={server.id} server={server} index={index} />
            ))
          ) : (
            <div className="card p-16 text-center">
              <div className="text-white/20 mb-5">
                <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No servers found</h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto">
                We couldn&apos;t find any servers matching your criteria. Try adjusting your filters.
              </p>
              <Link href="/rankings" className="btn-primary">Clear All Filters</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.length > 0 ? (
            servers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))
          ) : (
            <div className="col-span-full card p-16 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">No servers found</h3>
              <Link href="/rankings" className="btn-primary">Clear All Filters</Link>
            </div>
          )}
        </div>
      )}

      {/* Pagination — pure links (no JS needed) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {page > 1 ? (
            <Link
              href={pageUrl(page - 1)}
              className="btn-ghost p-2.5"
              aria-label="Previous page"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
          ) : (
            <span className="btn-ghost p-2.5 opacity-40 cursor-not-allowed">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => {
                const prev = arr[i - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-1.5">
                    {showEllipsis && <span className="px-2 text-white/30">...</span>}
                    <Link
                      href={pageUrl(p)}
                      className={`w-10 h-10 rounded-xl font-medium transition-all flex items-center justify-center ${
                        p === page
                          ? "bg-hytale-500 text-white shadow-lg shadow-hytale-500/25"
                          : "bg-night-800/60 text-white/60 border border-white/5 hover:text-white hover:bg-night-700/60"
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}
          </div>

          {page < totalPages ? (
            <Link
              href={pageUrl(page + 1)}
              className="btn-ghost p-2.5"
              aria-label="Next page"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ) : (
            <span className="btn-ghost p-2.5 opacity-40 cursor-not-allowed">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
