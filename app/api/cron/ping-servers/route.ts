import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { queryServer, parseServerAddress, calculateUptime } from "@/lib/server-query";

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// Type definitions
interface ServerRow {
  id: string;
  ip: string;
  query_port: number | null;
}

// Maximum servers to ping per invocation (to stay within timeout limits)
const MAX_SERVERS_PER_RUN = 50;

// How often servers should be pinged (in minutes)
const PING_INTERVAL_MINUTES = 5;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron adds this automatically)
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

    // Get servers that need pinging
    // Priority: servers not pinged recently, or never pinged
    const pingCutoff = new Date(
      Date.now() - PING_INTERVAL_MINUTES * 60 * 1000
    ).toISOString();

    type ServersQuery = {
      from: (table: string) => {
        select: (query: string) => {
          or: (condition: string) => {
            limit: (n: number) => Promise<{ data: ServerRow[] | null; error: Error | null }>
          }
        }
      }
    };
    const supabase = adminSupabase as unknown as ServersQuery;
    const { data: servers, error: fetchError } = await supabase
      .from("servers")
      .select("id, ip, query_port")
      .or(`last_ping.is.null,last_ping.lt.${pingCutoff}`)
      .limit(MAX_SERVERS_PER_RUN);

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
        message: "No servers need pinging",
        pinged: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Pinging ${servers.length} servers...`);

    // Ping all servers in parallel
    const pingResults = await Promise.allSettled(
      servers.map(async (server) => {
        const { host, port } = parseServerAddress(server.ip);
        const status = await queryServer(host, server.query_port || undefined, port);

        return {
          serverId: server.id,
          ...status,
        };
      })
    );

    // Process results and update database
    const updates: Array<{
      serverId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const result of pingResults) {
      if (result.status === "fulfilled") {
        const { serverId, ...status } = result.value;

        // Update server status
        type UpdateQuery = {
          from: (table: string) => {
            update: (data: Record<string, string | number | null | undefined>) => {
              eq: (col: string, val: string) => Promise<{ error: Error | null }>
            }
          }
        };
        const updateSupabase = adminSupabase as unknown as UpdateQuery;
        const { error: updateError } = await updateSupabase
          .from("servers")
          .update({
            status: status.online ? "online" : "offline",
            players_online: status.playerCount,
            players_max: status.maxPlayers || undefined,
            latency: status.online ? status.latencyMs : null,
            last_ping: status.lastChecked,
          })
          .eq("id", serverId);

        if (updateError) {
          console.error(`Error updating server ${serverId}:`, updateError);
          updates.push({ serverId, success: false, error: updateError.message });
          continue;
        }

        // Log to status history for graphs
        type InsertQuery = {
          from: (table: string) => {
            insert: (data: Record<string, string | number | null>) => Promise<{ error: Error | null }>
          }
        };
        const insertSupabase = adminSupabase as unknown as InsertQuery;
        const { error: historyError } = await insertSupabase
          .from("server_status_history")
          .insert({
            server_id: serverId,
            players_online: status.playerCount,
            status: status.online ? "online" : "offline",
            latency: status.online ? status.latencyMs : null,
          });

        if (historyError) {
          console.error(`Error logging history for ${serverId}:`, historyError);
        }

        updates.push({ serverId, success: true });
      } else {
        console.error("Ping failed:", result.reason);
        updates.push({
          serverId: "unknown",
          success: false,
          error: result.reason?.message || "Unknown error",
        });
      }
    }

    const successCount = updates.filter((u) => u.success).length;
    const failCount = updates.filter((u) => !u.success).length;

    console.log(`Ping complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      pinged: servers.length,
      successful: successCount,
      failed: failCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron ping error:", error);
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
