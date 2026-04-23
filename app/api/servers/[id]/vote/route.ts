import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { computeTrustScore, verdictFromScore } from "@/lib/anti-fraud/score";

// Vote cooldown in hours (used by GET handler)
const VOTE_COOLDOWN_HOURS = 24;

// IP salt for hashing (from environment variable)
const IP_SALT = process.env.IP_SALT;
if (!IP_SALT) {
  throw new Error("IP_SALT env var is required for vote hashing — refusing to start");
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serverId } = await params;
  const body = await request.json().catch(() => ({})) as {
    visitorId?: string;
    username?: string;
    telemetry?: { mouseEntropy?: number; dwellMs?: number; tabWasVisible?: boolean };
  };

  const ip = getClientIP(request);
  const ipHash = hashIP(ip);
  const userAgent = request.headers.get("user-agent") ?? "";
  const uaHash = createHash("sha256").update(userAgent).digest("hex").slice(0, 32);

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Identify the voter (optional — anonymous voting still allowed)
  let userId: string | null = null;
  let accountAgeSeconds: number | undefined;
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      if (user.created_at) {
        accountAgeSeconds = Math.floor(
          (Date.now() - new Date(user.created_at).getTime()) / 1000,
        );
      }
    }
  }

  // Confirm server exists
  const { data: server } = await (admin as any)
    .from("servers")
    .select("id, name, votifier_enabled, votifier_ip, votifier_port")
    .eq("id", serverId)
    .single();
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  // Layer: fingerprint dedupe within 12h bucket (uses the same generated column
  // as the DB unique index)
  const twelveHoursAgo = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  let fingerprintFresh = true;
  if (body.visitorId) {
    const { data: fpHit } = await (admin as any)
      .from("votes")
      .select("id")
      .eq("server_id", serverId)
      .eq("visitor_id", body.visitorId)
      .gte("created_at", twelveHoursAgo)
      .limit(1)
      .maybeSingle();
    fingerprintFresh = !fpHit;
  }

  // Layer: IP sliding window (5 votes / 10min across ALL servers for this IP)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentIpCount } = await (admin as any)
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", tenMinAgo);
  const ipBucketOk = (recentIpCount ?? 0) < 5;

  // Compute trust score
  const t = body.telemetry ?? {};
  const trust = computeTrustScore({
    accountAgeSeconds,
    fingerprintFresh,
    ipBucketOk,
    mouseEntropy: Math.max(0, Math.min(1, t.mouseEntropy ?? 0)),
    dwellMs: Math.max(0, t.dwellMs ?? 0),
    tabWasVisible: t.tabWasVisible !== false,
  });
  const status = verdictFromScore(trust);  // 'valid' | 'shadow_invalidated'

  // Insert. The DB-layer partial unique index is our final safety net for 12h
  // cooldown on authenticated voters.
  const insertRow = {
    server_id: serverId,
    user_id: userId,
    ip_hash: ipHash,
    ua_hash: uaHash,
    visitor_id: body.visitorId ?? null,
    user_agent: userAgent,
    trust_score: trust,
    status,
    source: "web",
  };

  const { data: inserted, error: insertError } = await (admin as any)
    .from("votes")
    .insert(insertRow)
    .select("id")
    .single();

  if (insertError) {
    // unique_violation (23505) — user already voted valid in same 12h bucket.
    // Downgrade this attempt to shadow. Never teach botters.
    if ((insertError as { code?: string }).code === "23505") {
      await (admin as any)
        .from("votes")
        .insert({ ...insertRow, status: "shadow_invalidated" });
    } else {
      console.error("Vote insert error:", insertError);
      // Don't leak details — return generic 200 to avoid teaching attackers.
      return NextResponse.json(
        { success: true, voteId: null, message: "Vote recorded successfully!", nextVoteAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString() },
        { status: 200 },
      );
    }
  }

  // Optional: queue Votifier delivery for legit votes only
  if (status === "valid" && server.votifier_enabled && body.username && inserted) {
    await (admin as any).from("vote_deliveries").insert({
      vote_id: inserted.id,
      server_id: serverId,
      username: body.username,
      status: "pending",
    });
  }

  return NextResponse.json({
    success: true,
    voteId: inserted?.id ?? null,
    message: "Vote recorded successfully!",
    nextVoteAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
  });
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
    type VoteRow = {
      id: string;
      created_at: string;
    };
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
