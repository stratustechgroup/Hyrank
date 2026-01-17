import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

// Type definitions for Supabase queries
interface ServerRow {
  id: string;
  name: string;
  votifier_enabled: boolean | null;
  votifier_ip: string | null;
  votifier_port: number | null;
}

interface VoteRow {
  id: string;
  created_at: string;
}

// Vote cooldown in hours
const VOTE_COOLDOWN_HOURS = 24;

// Rate limiting: max votes per IP per day across all servers
const MAX_VOTES_PER_IP_PER_DAY = 50;

// IP salt for hashing (from environment variable)
const IP_SALT = process.env.IP_SALT || "default-salt-change-me";

// Hash IP address for privacy
function hashIP(ip: string): string {
  return createHash("sha256")
    .update(ip + IP_SALT)
    .digest("hex");
}

// Get client IP from request headers
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

interface VoteRequestBody {
  visitorId?: string; // Browser fingerprint
  username?: string; // For Votifier notifications
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const body: VoteRequestBody = await request.json().catch(() => ({}));
    const { visitorId, username } = body;

    // Get client IP
    const ip = getClientIP(request);
    const ipHash = hashIP(ip);
    const userAgent = request.headers.get("user-agent") || "";

    // Create Supabase clients
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Check if Supabase is configured
    if (!adminSupabase) {
      return NextResponse.json(
        { error: "Database not configured", message: "Voting requires database configuration" },
        { status: 503 }
      );
    }

    // Check if user is authenticated (optional - voting works without auth)
    let userId: string | null = null;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // =============================================
    // ANTI-MANIPULATION CHECKS
    // =============================================

    // Query type definitions
    type ServerSingleQuery = {
      from: (table: string) => {
        select: (query: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: ServerRow | null; error: Error | null }>
          }
        }
      }
    };
    type VoteQuery = {
      from: (table: string) => {
        select: (query: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              gte: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    single: () => Promise<{ data: VoteRow | null }>
                  }
                }
              }
            }
          }
        }
      }
    };
    type FingerprintVoteQuery = {
      from: (table: string) => {
        select: (query: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              gte: (col: string, val: string) => {
                limit: (n: number) => {
                  single: () => Promise<{ data: { id: string } | null }>
                }
              }
            }
          }
        }
      }
    };
    type CountQuery = {
      from: (table: string) => {
        select: (query: string, opts: { count: string; head: boolean }) => {
          eq: (col: string, val: string) => {
            gte: (col: string, val: string) => Promise<{ count: number | null }>
          }
        }
      }
    };
    type InsertQuery = {
      from: (table: string) => {
        insert: (data: Record<string, string | null>) => {
          select: (query: string) => {
            single: () => Promise<{ data: { id: string } | null; error: Error | null }>
          }
        }
      }
    };
    type SimpleInsertQuery = {
      from: (table: string) => {
        insert: (data: Record<string, string>) => Promise<{ error: Error | null }>
      }
    };
    type RpcQuery = {
      rpc: (name: string, params: Record<string, string>) => Promise<{ error: Error | null }>
    };

    // 1. Check if server exists
    const serverSupabase = adminSupabase as unknown as ServerSingleQuery;
    const { data: server, error: serverError } = await serverSupabase
      .from("servers")
      .select("id, name, votifier_enabled, votifier_ip, votifier_port")
      .eq("id", serverId)
      .single();

    if (serverError || !server) {
      return NextResponse.json(
        { error: "Server not found" },
        { status: 404 }
      );
    }

    // 2. Check IP-based cooldown (24 hours per server)
    const cooldownTime = new Date(
      Date.now() - VOTE_COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();

    const voteSupabase = adminSupabase as unknown as VoteQuery;
    const { data: recentIPVote } = await voteSupabase
      .from("votes")
      .select("id, created_at")
      .eq("server_id", serverId)
      .eq("ip_hash", ipHash)
      .gte("created_at", cooldownTime)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentIPVote) {
      const votedAt = new Date(recentIPVote.created_at);
      const canVoteAt = new Date(
        votedAt.getTime() + VOTE_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      const remainingMs = canVoteAt.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

      return NextResponse.json(
        {
          error: "Vote cooldown active",
          message: `You can vote again in ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`,
          canVoteAt: canVoteAt.toISOString(),
          remainingMs,
        },
        { status: 429 }
      );
    }

    // 3. Check user-based cooldown (if logged in)
    if (userId) {
      const { data: recentUserVote } = await voteSupabase
        .from("votes")
        .select("id, created_at")
        .eq("server_id", serverId)
        .eq("user_id", userId)
        .gte("created_at", cooldownTime)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentUserVote) {
        const votedAt = new Date(recentUserVote.created_at);
        const canVoteAt = new Date(
          votedAt.getTime() + VOTE_COOLDOWN_HOURS * 60 * 60 * 1000
        );
        const remainingMs = canVoteAt.getTime() - Date.now();
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

        return NextResponse.json(
          {
            error: "Vote cooldown active",
            message: `You can vote again in ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`,
            canVoteAt: canVoteAt.toISOString(),
            remainingMs,
          },
          { status: 429 }
        );
      }
    }

    // 4. Check fingerprint-based cooldown (if provided)
    if (visitorId) {
      const fingerprintSupabase = adminSupabase as unknown as FingerprintVoteQuery;
      const { data: recentFingerprintVote } = await fingerprintSupabase
        .from("votes")
        .select("id")
        .eq("server_id", serverId)
        .eq("visitor_id", visitorId)
        .gte("created_at", cooldownTime)
        .limit(1)
        .single();

      if (recentFingerprintVote) {
        return NextResponse.json(
          {
            error: "Vote cooldown active",
            message: "You have already voted for this server recently",
          },
          { status: 429 }
        );
      }
    }

    // 5. Rate limiting: Check total votes from this IP today
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const countSupabase = adminSupabase as unknown as CountQuery;
    const { count: ipVotesToday } = await countSupabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneDayAgo);

    if (ipVotesToday && ipVotesToday >= MAX_VOTES_PER_IP_PER_DAY) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many votes from this network. Please try again later.",
        },
        { status: 429 }
      );
    }

    // 6. Velocity check: Detect coordinated voting
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentServerVotes } = await countSupabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("server_id", serverId)
      .gte("created_at", tenMinutesAgo);

    // Flag server for review if more than 50 votes in 10 minutes
    if (recentServerVotes && recentServerVotes > 50) {
      // Log suspicious activity (in production, this would be more sophisticated)
      console.warn(
        `[Vote Alert] Server ${serverId} has ${recentServerVotes} votes in last 10 minutes`
      );
    }

    // =============================================
    // RECORD THE VOTE
    // =============================================

    const insertSupabase = adminSupabase as unknown as InsertQuery;
    const { data: vote, error: voteError } = await insertSupabase
      .from("votes")
      .insert({
        server_id: serverId,
        user_id: userId,
        ip_hash: ipHash,
        visitor_id: visitorId || null,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (voteError) {
      console.error("Vote insert error:", voteError);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 }
      );
    }

    // =============================================
    // VOTIFIER NOTIFICATION (if configured)
    // =============================================

    // Note: In production, this would be handled asynchronously
    // by a queue system to avoid blocking the response
    if (server.votifier_enabled && username && vote) {
      // Queue vote delivery for async processing
      const deliverySupabase = adminSupabase as unknown as SimpleInsertQuery;
      await deliverySupabase.from("vote_deliveries").insert({
        vote_id: vote.id,
        server_id: serverId,
        username: username,
        status: "pending",
      });
    }

    // =============================================
    // UPDATE USER STATS (if logged in)
    // =============================================

    if (userId) {
      const rpcSupabase = adminSupabase as unknown as RpcQuery;
      await rpcSupabase.rpc("increment_user_votes", { user_id: userId });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      voteId: vote?.id,
      message: "Vote recorded successfully!",
      nextVoteAt: new Date(
        Date.now() + VOTE_COOLDOWN_HOURS * 60 * 60 * 1000
      ).toISOString(),
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check vote status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const ip = getClientIP(request);
    const ipHash = hashIP(ip);

    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Check if Supabase is configured
    if (!adminSupabase) {
      // Return default "can vote" when database not configured
      return NextResponse.json({
        canVote: true,
        lastVoteAt: null,
        canVoteAt: null,
        remainingMs: 0,
      });
    }

    // Check if user is authenticated
    let userId: string | null = null;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // Check cooldown
    const cooldownTime = new Date(
      Date.now() - VOTE_COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Check IP-based vote
    type GetVoteQuery = {
      from: (table: string) => {
        select: (query: string) => {
          eq: (col: string, val: string) => {
            or: (condition: string) => {
              gte: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    single: () => Promise<{ data: VoteRow | null }>
                  }
                }
              }
            }
          }
        }
      }
    };
    const getVoteSupabase = adminSupabase as unknown as GetVoteQuery;
    const { data: recentVote } = await getVoteSupabase
      .from("votes")
      .select("id, created_at")
      .eq("server_id", serverId)
      .or(`ip_hash.eq.${ipHash}${userId ? `,user_id.eq.${userId}` : ""}`)
      .gte("created_at", cooldownTime)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentVote) {
      const votedAt = new Date(recentVote.created_at);
      const canVoteAt = new Date(
        votedAt.getTime() + VOTE_COOLDOWN_HOURS * 60 * 60 * 1000
      );

      return NextResponse.json({
        canVote: false,
        lastVoteAt: votedAt.toISOString(),
        canVoteAt: canVoteAt.toISOString(),
        remainingMs: Math.max(0, canVoteAt.getTime() - Date.now()),
      });
    }

    return NextResponse.json({
      canVote: true,
      lastVoteAt: null,
      canVoteAt: null,
      remainingMs: 0,
    });
  } catch (error) {
    console.error("Vote status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
