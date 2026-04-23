import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { fetchAllServerSignals } from "@/lib/ranking/signals";
import { compositeScore } from "@/lib/ranking/score";

export async function POST(request: NextRequest) {
  return GET(request);
}

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const startedAt = Date.now();
  let signals;
  try {
    signals = await fetchAllServerSignals();
  } catch (err) {
    console.error("signal fetch failed:", err);
    return NextResponse.json({ error: "signal fetch failed" }, { status: 500 });
  }

  if (signals.length === 0) {
    return NextResponse.json({ updated: 0, total: 0, elapsedMs: Date.now() - startedAt });
  }

  const rows = signals.map((s) => {
    const { composite, components } = compositeScore(s);
    return {
      server_id: s.serverId,
      composite_score: composite,
      bayesian_quality: components.bayesianQuality,
      hot_velocity: components.hotVelocity,
      live_signal: components.liveSignal,
      retention: components.retention,
      uptime_signal: components.uptime,
      shadow_fraud_penalty: components.shadowFraudPenalty,
      computed_at: new Date().toISOString(),
    };
  });

  // Upsert server_rank in a single call
  const { error: upsertError } = await (admin as any)
    .from("server_rank")
    .upsert(rows, { onConflict: "server_id" });
  if (upsertError) {
    console.error("server_rank upsert failed:", upsertError);
    return NextResponse.json({ error: "rank write failed" }, { status: 500 });
  }

  // Backward-compat: update servers.ranking_score one row at a time (N ops,
  // but writes are small). Plan 4 will migrate reads to server_rank and
  // this loop can be removed.
  for (const r of rows) {
    await (admin as any)
      .from("servers")
      .update({ ranking_score: Math.round(r.composite_score * 10000) / 100 })
      .eq("id", r.server_id);
  }

  return NextResponse.json({
    updated: rows.length,
    total: signals.length,
    elapsedMs: Date.now() - startedAt,
    weights: {
      bayesian: 0.35,
      hot: 0.25,
      live: 0.20,
      retention: 0.15,
      uptime: 0.05,
      shadowPenalty: "-0.4 × shadow_fraud_rate",
    },
  });
}
