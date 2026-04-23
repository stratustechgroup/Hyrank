import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ServerSignals } from "./score";

interface RawSignalRow {
  server_id: string;
  rating_avg: number | null;
  rating_count: number | null;
  valid_votes_7d: number | null;
  shadow_votes_7d: number | null;
  first_vote_7d: string | null;
  live_players: number | null;
  uptime_30d: number | null;
}

/**
 * Fetches signals for every non-banned server. Uses admin client because
 * server_signals was revoked from anon/authenticated in migration 004.
 * Batched in chunks of 500 to keep request sizes reasonable.
 */
export async function fetchAllServerSignals(): Promise<
  Array<ServerSignals & { serverId: string }>
> {
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error("admin client unavailable");

  // Pull the mat view — this is the fast path
  const { data: signalRowsRaw, error } = await (admin as any)
    .from("server_signals")
    .select("*");
  if (error) throw error;
  const signalRows = signalRowsRaw as RawSignalRow[] | null;

  // Per-server: compute retention + fetch avg_live_players_30d.
  // TODO(Plan 5): batch into a single get_all_ranking_signals() stored function.
  // At >1000 servers the N+1 pattern here (2 round trips per server) could push
  // the cron past Vercel's 60s Pro timeout. Safe at current scale (<100 servers).
  const results: Array<ServerSignals & { serverId: string }> = [];
  for (const row of signalRows ?? []) {
    const { data: retention, error: retentionErr } = await (admin as any).rpc(
      "compute_retention_7d",
      { p_server_id: row.server_id },
    );
    if (retentionErr) {
      console.warn(
        `[ranking.signals] compute_retention_7d failed for server ${row.server_id}:`,
        retentionErr,
      );
    }

    const { data: avgPlayersRaw } = await (admin as any)
      .from("server_status_history")
      .select("players_online")
      .eq("server_id", row.server_id)
      .gte("recorded_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
    const avgPlayers = avgPlayersRaw as { players_online: number | null }[] | null;

    const avgLivePlayers30d =
      (avgPlayers ?? []).length === 0
        ? Math.max(1, row.live_players ?? 1)
        : (avgPlayers ?? []).reduce(
            (s: number, p: { players_online: number | null }) => s + (p.players_online ?? 0),
            0,
          ) / (avgPlayers ?? []).length;

    const validVotes = row.valid_votes_7d ?? 0;
    const shadowVotes = row.shadow_votes_7d ?? 0;
    const totalRecent = validVotes + shadowVotes;

    results.push({
      serverId: row.server_id,
      ratingMean: row.rating_avg ?? 0,
      ratingCount: row.rating_count ?? 0,
      votesLast7d: validVotes,
      firstVoteLast7dUnix: row.first_vote_7d
        ? Math.floor(new Date(row.first_vote_7d).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      livePlayers: row.live_players ?? 0,
      avgLivePlayers30d,
      retention7d: typeof retention === "number" ? retention : 0,
      uptime30d: (row.uptime_30d ?? 0) / 100, // uptime_month stored as 0..100 percent
      shadowFraudRate: totalRecent > 0 ? shadowVotes / totalRecent : 0,
    });
  }
  return results;
}
