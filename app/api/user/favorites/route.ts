import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// Type definitions
interface ServerData {
  id: string;
  name: string;
  ip: string;
  description: string | null;
  banner: string | null;
  tags: string[] | null;
  website: string | null;
  discord: string | null;
  verified: boolean | null;
  featured: boolean | null;
  featured_order: number | null;
  players_online: number | null;
  players_max: number | null;
  status: string | null;
  latency: number | null;
  uptime_day: number | null;
  uptime_week: number | null;
  uptime_month: number | null;
  vote_count: number | null;
  monthly_votes: number | null;
  weekly_votes: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string;
}

interface SavedServerRow {
  saved_at: string;
  servers: ServerData | null;
}

// GET - Get all saved servers for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ servers: [] });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ servers: [] });
    }

    const adminSupabase = createAdminSupabaseClient();
    if (!adminSupabase) {
      return NextResponse.json({ servers: [] });
    }

    // Get saved servers with full server data
    type SavedServersQuery = {
      from: (table: string) => {
        select: (query: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{ data: SavedServerRow[] | null; error: Error | null }>
          }
        }
      }
    };
    const querySupabase = adminSupabase as unknown as SavedServersQuery;
    const { data: savedServers, error } = await querySupabase
      .from("saved_servers")
      .select(`
        saved_at,
        servers (
          id,
          name,
          ip,
          description,
          banner,
          tags,
          website,
          discord,
          verified,
          featured,
          featured_order,
          players_online,
          players_max,
          status,
          latency,
          uptime_day,
          uptime_week,
          uptime_month,
          vote_count,
          monthly_votes,
          weekly_votes,
          rating_avg,
          rating_count,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved servers:", error);
      return NextResponse.json(
        { error: "Failed to fetch saved servers" },
        { status: 500 }
      );
    }

    // Transform to match Server interface
    const servers = savedServers?.map((item) => {
      const server = item.servers;
      if (!server) return null;

      return {
        id: server.id,
        name: server.name,
        ip: server.ip,
        description: server.description,
        banner: server.banner,
        tags: server.tags || [],
        website: server.website,
        discord: server.discord,
        verified: server.verified || false,
        featured: server.featured || false,
        featuredOrder: server.featured_order,
        players: {
          online: server.players_online || 0,
          max: server.players_max || 0,
        },
        status: server.status || "unknown",
        latency: server.latency,
        uptime: {
          day: server.uptime_day,
          week: server.uptime_week,
          month: server.uptime_month,
        },
        votes: server.vote_count || 0,
        monthlyVotes: server.monthly_votes || 0,
        weeklyVotes: server.weekly_votes || 0,
        rating: {
          average: server.rating_avg || 0,
          count: server.rating_count || 0,
        },
        rank: 0, // Will be calculated client-side if needed
        createdAt: server.created_at,
        savedAt: item.saved_at,
      };
    }).filter(Boolean);

    return NextResponse.json({ servers });
  } catch (error) {
    console.error("Error fetching saved servers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
