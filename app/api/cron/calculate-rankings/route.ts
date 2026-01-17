import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// Type for server ranking data
interface ServerRankingData {
  id: string;
  vote_count: number | null;
  monthly_votes: number | null;
  uptime_month: number | null;
  players_online: number | null;
  players_max: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  featured: boolean | null;
  featured_order: number | null;
}

// Ranking weights
const WEIGHTS = {
  votes: 0.35,           // 35% - Total votes
  monthlyVotes: 0.25,    // 25% - Recent activity
  uptime: 0.15,          // 15% - Reliability
  players: 0.15,         // 15% - Current activity
  rating: 0.10,          // 10% - User satisfaction
};

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminSupabaseClient();

    if (!adminSupabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    // Get all servers with relevant metrics
    type SupabaseQuery = { from: (table: string) => { select: (query: string) => Promise<{ data: ServerRankingData[] | null; error: Error | null }> } };
    const supabase = adminSupabase as unknown as SupabaseQuery;
    const { data: servers, error: fetchError } = await supabase
      .from("servers")
      .select(`
        id,
        vote_count,
        monthly_votes,
        uptime_month,
        players_online,
        players_max,
        rating_avg,
        rating_count,
        featured,
        featured_order
      `);

    if (fetchError) {
      console.error("Error fetching servers:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch servers" },
        { status: 500 }
      );
    }

    if (!servers || servers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No servers to rank",
        updated: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Calculating rankings for ${servers.length} servers...`);

    // Find max values for normalization
    const maxVotes = Math.max(...servers.map((s) => s.vote_count || 0), 1);
    const maxMonthlyVotes = Math.max(...servers.map((s) => s.monthly_votes || 0), 1);
    const maxPlayers = Math.max(...servers.map((s) => s.players_online || 0), 1);

    // Calculate scores for each server
    const scoredServers = servers.map((server) => {
      // Normalize each metric to 0-100 scale
      const voteScore = ((server.vote_count || 0) / maxVotes) * 100;
      const monthlyVoteScore = ((server.monthly_votes || 0) / maxMonthlyVotes) * 100;
      const uptimeScore = server.uptime_month || 0; // Already 0-100
      const playerScore = ((server.players_online || 0) / maxPlayers) * 100;
      const ratingScore = ((server.rating_avg || 0) / 5) * 100; // Rating is 1-5, normalize to 0-100

      // Calculate weighted score
      const totalScore =
        voteScore * WEIGHTS.votes +
        monthlyVoteScore * WEIGHTS.monthlyVotes +
        uptimeScore * WEIGHTS.uptime +
        playerScore * WEIGHTS.players +
        ratingScore * WEIGHTS.rating;

      return {
        id: server.id,
        score: totalScore,
        featured: server.featured,
        featuredOrder: server.featured_order,
      };
    });

    // Sort by score (featured servers are handled separately)
    const featuredServers = scoredServers
      .filter((s) => s.featured)
      .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999));

    const regularServers = scoredServers
      .filter((s) => !s.featured)
      .sort((a, b) => b.score - a.score);

    // Assign ranks
    // Featured servers get top positions based on their featured_order
    // Regular servers are ranked below featured ones
    let successCount = 0;
    let failCount = 0;

    // Note: In a real implementation, you might store the rank in the database
    // For now, the ranking is calculated on-the-fly based on the score
    // But we can store the calculated score for faster queries

    for (const server of scoredServers) {
      const supabaseUpdate = adminSupabase as unknown as { from: (table: string) => { update: (data: Record<string, number>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } } };
      const { error: updateError } = await supabaseUpdate
        .from("servers")
        .update({
          ranking_score: Math.round(server.score * 100) / 100,
        })
        .eq("id", server.id);

      if (updateError) {
        console.error(`Error updating ranking for ${server.id}:`, updateError);
        failCount++;
      } else {
        successCount++;
      }
    }

    console.log(`Ranking calculation complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failCount,
      total: servers.length,
      weights: WEIGHTS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron ranking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
