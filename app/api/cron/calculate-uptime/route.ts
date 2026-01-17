import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// Type definitions for Supabase queries
interface ServerRow {
  id: string;
}

interface StatusHistoryRow {
  status: string;
  recorded_at: string;
}

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

    // Get all servers
    type ServersQuery = { from: (table: string) => { select: (query: string) => Promise<{ data: ServerRow[] | null; error: Error | null }> } };
    const supabase = adminSupabase as unknown as ServersQuery;
    const { data: servers, error: fetchError } = await supabase
      .from("servers")
      .select("id");

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
        message: "No servers to update",
        updated: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Calculating uptime for ${servers.length} servers...`);

    let successCount = 0;
    let failCount = 0;

    // Calculate uptime for each server
    for (const server of servers) {
      try {
        // Get status history for the past 30 days
        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        type HistoryQuery = {
          from: (table: string) => {
            select: (query: string) => {
              eq: (col: string, val: string) => {
                gte: (col: string, val: string) => {
                  order: (col: string, opts: { ascending: boolean }) => Promise<{ data: StatusHistoryRow[] | null; error: Error | null }>
                }
              }
            }
          }
        };
        const historySupabase = adminSupabase as unknown as HistoryQuery;
        const { data: history, error: historyError } = await historySupabase
          .from("server_status_history")
          .select("status, recorded_at")
          .eq("server_id", server.id)
          .gte("recorded_at", thirtyDaysAgo)
          .order("recorded_at", { ascending: false });

        if (historyError) {
          console.error(`Error fetching history for ${server.id}:`, historyError);
          failCount++;
          continue;
        }

        if (!history || history.length === 0) {
          // No history, skip
          continue;
        }

        // Calculate uptime percentages
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

        const dayHistory = history.filter(
          (h) => new Date(h.recorded_at).getTime() >= dayAgo
        );
        const weekHistory = history.filter(
          (h) => new Date(h.recorded_at).getTime() >= weekAgo
        );
        const monthHistory = history;

        const calculateUptimePercent = (
          data: Array<{ status: string }>
        ): number | null => {
          if (data.length === 0) return null;
          const onlineCount = data.filter((h) => h.status === "online").length;
          return Math.round((onlineCount / data.length) * 10000) / 100;
        };

        const uptimeDay = calculateUptimePercent(dayHistory);
        const uptimeWeek = calculateUptimePercent(weekHistory);
        const uptimeMonth = calculateUptimePercent(monthHistory);

        // Update server with new uptime values
        type UpdateQuery = {
          from: (table: string) => {
            update: (data: Record<string, number | null>) => {
              eq: (col: string, val: string) => Promise<{ error: Error | null }>
            }
          }
        };
        const updateSupabase = adminSupabase as unknown as UpdateQuery;
        const { error: updateError } = await updateSupabase
          .from("servers")
          .update({
            uptime_day: uptimeDay,
            uptime_week: uptimeWeek,
            uptime_month: uptimeMonth,
          })
          .eq("id", server.id);

        if (updateError) {
          console.error(`Error updating uptime for ${server.id}:`, updateError);
          failCount++;
          continue;
        }

        successCount++;
      } catch (error) {
        console.error(`Error processing server ${server.id}:`, error);
        failCount++;
      }
    }

    console.log(`Uptime calculation complete: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failCount,
      total: servers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron uptime error:", error);
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
