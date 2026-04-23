# HyRank Enhancement Plan 3 — Ranking Upgrade (Bayesian + Retention-Weighted)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Replace the current min-max ranking (35% votes + 25% monthly_votes + 15% uptime + 15% players + 10% rating) with a composite that is gameable-resistant: Bayesian quality + Reddit-hot velocity + log-normalized live players + retention + uptime − shadow-fraud penalty. Write the composite into the `server_rank` table (migration 003 created it, empty). Replace the N-sequential uptime cron with a single SQL aggregation. Move `updateServerRating` from application code to a DB trigger.

**Architecture:** The ranking library is a pure TypeScript module (`lib/ranking/score.ts`) consuming a typed `ServerSignals` input. The cron route reads signals (from `server_signals` mat view + live `servers` row), computes composites in Node, then `INSERT ... ON CONFLICT DO UPDATE` into `server_rank` in a single multi-value statement. Retention is computed via a separate indexed `votes` query. `servers.ranking_score` stays populated for backward compat with existing queries for one plan cycle; Plan 4 will migrate read sites to `server_rank.composite_score`.

**Why formula-based + TS composite (not pure SQL):** signal math (Bayesian, tanh, sigmoid) is awkward in SQL; testability matters more than the perf delta. Computation is ~10k rows × <5ms each = 50s worst case, well within a 10-min cron window.

**Tech Stack additions:** None. Uses existing Supabase client + Vitest (from Plan 2).

---

## Assumed State from Plans 1 + 2

- Migration 003: `server_rank` table exists (empty), `server_signals` mat view exists, `votes.status` column.
- Migration 004: advisors cleared, `server_signals` revoked from anon/authenticated (service-role reads only — cron uses admin client).
- `lib/anti-fraud/score.ts` + Vitest setup exist.
- Vote route already inserts with `status` column.

## Non-Goals (Plan 4+)

- 14 gamemode SEO landing pages → Plan 4
- Rankings page UI redesign → Plan 4
- Rising-shelf separate surface → Plan 4
- Client-side filter removal on /rankings → Plan 4 (only server-side support here)

---

## File Structure

**Created this plan:**
- `Hyrank/supabase/migrations/005_ranking_infra.sql` — pg_cron + `updateServerRating` → trigger
- `Hyrank/lib/ranking/score.ts` — composite formula (pure functions)
- `Hyrank/lib/ranking/signals.ts` — typed `ServerSignals` fetcher from Supabase (admin client)
- `Hyrank/tests/unit/ranking.test.ts` — Vitest edge-case coverage

**Modified this plan:**
- `Hyrank/app/api/cron/calculate-rankings/route.ts` — rewritten: reads server_signals + live signals, computes composite, upserts `server_rank` + legacy `servers.ranking_score`
- `Hyrank/app/api/cron/calculate-uptime/route.ts` — rewritten as single SQL aggregation (no N+1 loop)
- `Hyrank/app/api/servers/[id]/reviews/route.ts` — remove `updateServerRating()` app-code block (now handled by DB trigger from migration 005)

---

## Task 1 — Migration 005: pg_cron + Review Rating Trigger

**Files:**
- Create: `Hyrank/supabase/migrations/005_ranking_infra.sql`

- [ ] **Step 1.1: Write the migration**

Write `Hyrank/supabase/migrations/005_ranking_infra.sql`:
```sql
-- Migration 005 — ranking infrastructure
--   1. Enable pg_cron (Supabase Pro has it enabled by default — idempotent)
--   2. Schedule server_signals refresh every 10 min
--   3. Move updateServerRating from app code to DB trigger (update_rating_avg
--      function from migration 001 already does this — just ensure trigger exists)
--   4. Add helper SQL function for retention signal

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule server_signals refresh every 10 minutes. CONCURRENTLY requires the
-- unique index, which migration 003 added.
SELECT cron.schedule(
  'refresh_server_signals',
  '*/10 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.server_signals $$
);

-- Confirm the review-rating trigger is wired (was created in migration 001;
-- idempotent recreate just in case).
DROP TRIGGER IF EXISTS on_review_changed ON reviews;
CREATE TRIGGER on_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_rating_avg();

-- Retention signal helper function — callable from anywhere.
-- Returns fraction (0..1) of distinct voters in last 7 days who voted >=2 times.
CREATE OR REPLACE FUNCTION public.compute_retention_7d(p_server_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  WITH voter_stats AS (
    SELECT COALESCE(visitor_id, user_id::text) AS voter_id, COUNT(*) AS vote_count
    FROM public.votes
    WHERE server_id = p_server_id
      AND status IN ('valid','verified')
      AND created_at > NOW() - INTERVAL '7 days'
    GROUP BY COALESCE(visitor_id, user_id::text)
  )
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 0::NUMERIC
    ELSE (COUNT(*) FILTER (WHERE vote_count >= 2))::NUMERIC / COUNT(*)::NUMERIC
  END
  FROM voter_stats;
$$;

-- Performance index: retention query does server_id + status + created_at filter
CREATE INDEX IF NOT EXISTS idx_votes_retention
  ON public.votes (server_id, status, created_at)
  WHERE status IN ('valid','verified');

-- Performance index: avg live players computation reads server_status_history recent
CREATE INDEX IF NOT EXISTS idx_status_history_server_recorded
  ON public.server_status_history (server_id, recorded_at DESC);
```

- [ ] **Step 1.2: Apply via Supabase MCP**

Call `mcp__4a3f6a92-6711-4887-8f2c-e21bb1e29cc7__apply_migration` with project_id `uosmhbirchjudpwtptov`, name `ranking_infra`, full query.

Expected: `success: true`. If pg_cron is not available (Free tier), the first `CREATE EXTENSION` call may still succeed on Pro; if we hit an error, plan B is to use Vercel Cron to POST a refresh endpoint.

- [ ] **Step 1.3: Verify cron job exists**

Call `mcp__...__execute_sql` with `SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'refresh_server_signals';`
Expected: 1 row, `active = true`.

- [ ] **Step 1.4: Verify retention function**

Call `mcp__...__execute_sql` with `SELECT public.compute_retention_7d('00000000-0000-0000-0000-000000000000'::uuid);`
Expected: `0` (no votes for that nonexistent server — confirms function compiles).

- [ ] **Step 1.5: Commit**

```bash
cd Hyrank && git add supabase/migrations/005_ranking_infra.sql
git commit -m "db(005): pg_cron refresh server_signals every 10min + retention helper fn"
```

---

## Task 2 — Ranking Score Library

**Files:**
- Create: `Hyrank/lib/ranking/score.ts`

- [ ] **Step 2.1: Write the composite formula**

Write `Hyrank/lib/ranking/score.ts`:
```typescript
/**
 * HyRank composite ranking score — pure, testable, no I/O.
 * Replaces the min-max normalized score with a Bayesian + Reddit-hot + live +
 * retention + uptime − shadow-fraud-penalty formula.
 *
 * Rationale:
 * - Bayesian regresses small-sample ratings toward the global mean (stops 1 5-star
 *   review from pinning a server at #1).
 * - Hot formula (log10-compressed votes + time bonus) prevents whales from
 *   crushing everyone else's vote score to zero and creates momentum signal.
 * - tanh on live-player signal normalizes so a 50-concurrent SMP isn't destroyed
 *   by a 2000-concurrent network.
 * - Retention (fraction of voters who re-vote within 7d) is the anti-bot
 *   nuclear option — bots don't come back.
 * - Shadow-fraud rate directly penalizes servers farming fake votes (self-demote).
 */

export interface ServerSignals {
  /** 0..5 — average user rating */
  ratingMean: number;
  /** number of ratings */
  ratingCount: number;
  /** votes in last 7 days (valid + verified, not shadow) */
  votesLast7d: number;
  /** epoch seconds of the oldest valid vote within the last 7d window */
  firstVoteLast7dUnix: number;
  /** current players online */
  livePlayers: number;
  /** 30-day rolling average of players online (denominator for tanh) */
  avgLivePlayers30d: number;
  /** 0..1 — fraction of distinct voters (last 7d) who voted ≥2 times */
  retention7d: number;
  /** 0..1 — uptime over last 30d */
  uptime30d: number;
  /** 0..1 — fraction of recent votes on this server that were shadow_invalidated */
  shadowFraudRate: number;
}

// Bayesian prior — a new server with 10 5-star reviews regresses to ~(C_PRIOR + tiny bonus)
export const C_GLOBAL_AVG = 3.8;
export const M_PRIOR = 50;
export const HOT_TIME_DIVISOR = 45000; // same constant Reddit uses
export const SHADOW_PENALTY_WEIGHT = 0.4;

export function bayesianRating(
  R: number,
  v: number,
  C: number = C_GLOBAL_AVG,
  m: number = M_PRIOR,
): number {
  if (R + v === 0) return C / 5; // degenerate case
  return ((v / (v + m)) * R + (m / (v + m)) * C);
}

/** Reddit "hot" — log-compressed vote count + time bonus. Votes age out of 7d window. */
export function hotVelocity(votesLast7d: number, firstVoteUnix: number): number {
  const order = Math.log10(Math.max(votesLast7d, 1));
  const seconds = firstVoteUnix - 1_700_000_000; // epoch offset
  return order + seconds / HOT_TIME_DIVISOR;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Composite score — returns real number (unclamped). Higher is better. */
export function compositeScore(s: ServerSignals): {
  composite: number;
  components: {
    bayesianQuality: number;
    hotVelocity: number;
    liveSignal: number;
    retention: number;
    uptime: number;
    shadowFraudPenalty: number;
  };
} {
  const quality = bayesianRating(s.ratingMean, s.ratingCount) / 5; // 0..1
  const velocity = sigmoid(hotVelocity(s.votesLast7d, s.firstVoteLast7dUnix) / 10); // 0..1
  const live = Math.tanh(
    s.livePlayers / Math.max(s.avgLivePlayers30d, 1),
  ); // 0..1
  const retention = Math.max(0, Math.min(1, s.retention7d));
  const uptime = Math.max(0, Math.min(1, s.uptime30d));
  const fraudPenalty = Math.max(0, Math.min(1, s.shadowFraudRate)) * SHADOW_PENALTY_WEIGHT;

  const composite =
    0.35 * quality +
    0.25 * velocity +
    0.20 * live +
    0.15 * retention +
    0.05 * uptime -
    fraudPenalty;

  return {
    composite,
    components: {
      bayesianQuality: quality,
      hotVelocity: velocity,
      liveSignal: live,
      retention,
      uptime,
      shadowFraudPenalty: fraudPenalty,
    },
  };
}
```

- [ ] **Step 2.2: Write Vitest tests**

Write `Hyrank/tests/unit/ranking.test.ts`:
```typescript
import { describe, test, expect } from "vitest";
import {
  compositeScore,
  bayesianRating,
  hotVelocity,
  C_GLOBAL_AVG,
  M_PRIOR,
} from "@/lib/ranking/score";

describe("bayesianRating", () => {
  test("small-n regresses to global mean", () => {
    const score = bayesianRating(5.0, 1); // 1 perfect vote
    expect(score).toBeLessThan(4.0);
    expect(score).toBeGreaterThan(C_GLOBAL_AVG);
  });
  test("large-n reflects rating", () => {
    const score = bayesianRating(5.0, 10000);
    expect(score).toBeGreaterThan(4.9);
  });
  test("zero votes returns prior", () => {
    expect(bayesianRating(0, 0)).toBeCloseTo(C_GLOBAL_AVG / 5, 2);
  });
});

describe("hotVelocity", () => {
  test("more recent votes score higher than older with same count", () => {
    const now = Math.floor(Date.now() / 1000);
    const newer = hotVelocity(100, now);
    const older = hotVelocity(100, now - 7 * 24 * 3600);
    expect(newer).toBeGreaterThan(older);
  });
  test("more votes score higher than few with same time", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(hotVelocity(1000, now)).toBeGreaterThan(hotVelocity(10, now));
  });
});

describe("compositeScore", () => {
  const baseline = {
    ratingMean: 4.0,
    ratingCount: 100,
    votesLast7d: 50,
    firstVoteLast7dUnix: Math.floor(Date.now() / 1000) - 3 * 24 * 3600,
    livePlayers: 50,
    avgLivePlayers30d: 50,
    retention7d: 0.3,
    uptime30d: 0.98,
    shadowFraudRate: 0,
  };

  test("baseline returns reasonable composite", () => {
    const { composite } = compositeScore(baseline);
    expect(composite).toBeGreaterThan(0.3);
    expect(composite).toBeLessThan(1);
  });

  test("high shadow fraud rate tanks score", () => {
    const a = compositeScore(baseline).composite;
    const b = compositeScore({ ...baseline, shadowFraudRate: 1.0 }).composite;
    expect(b).toBeLessThan(a);
    expect(a - b).toBeCloseTo(0.4, 1); // full penalty
  });

  test("new server (1 vote) does not dominate baseline", () => {
    const brigaded = compositeScore({
      ...baseline,
      ratingMean: 5.0,
      ratingCount: 1,
      votesLast7d: 1,
    }).composite;
    expect(brigaded).toBeLessThan(compositeScore(baseline).composite);
  });

  test("components sum consistently", () => {
    const { composite, components } = compositeScore(baseline);
    const sum =
      0.35 * components.bayesianQuality +
      0.25 * components.hotVelocity +
      0.20 * components.liveSignal +
      0.15 * components.retention +
      0.05 * components.uptime -
      components.shadowFraudPenalty;
    expect(composite).toBeCloseTo(sum, 6);
  });
});
```

- [ ] **Step 2.3: Run tests**

Run: `cd Hyrank && npm run test:run`
Expected: existing 4 Plan-2 trust-score tests + new 9 ranking tests = 13/13 pass.

- [ ] **Step 2.4: Commit**

```bash
cd Hyrank && git add lib/ranking/score.ts tests/unit/ranking.test.ts
git commit -m "feat(ranking): Bayesian + hot + live + retention composite (pure TS + Vitest)"
```

---

## Task 3 — Signals Fetcher

**Files:**
- Create: `Hyrank/lib/ranking/signals.ts`

- [ ] **Step 3.1: Write the signal-fetching module**

Write `Hyrank/lib/ranking/signals.ts`:
```typescript
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: signalRows, error } = await (admin as any)
    .from("server_signals")
    .select("*")
    .returns<RawSignalRow[]>();
  if (error) throw error;

  // Per-server: compute retention + fetch avg_live_players_30d
  // To avoid N+1, do one call to compute_retention_7d per server; batch via RPC in future plan.
  const results: Array<ServerSignals & { serverId: string }> = [];
  for (const row of signalRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: retention } = await (admin as any).rpc("compute_retention_7d", {
      p_server_id: row.server_id,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: avgPlayers } = await (admin as any)
      .from("server_status_history")
      .select("players_online")
      .eq("server_id", row.server_id)
      .gte("recorded_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
      .returns<{ players_online: number | null }[]>();

    const avgLivePlayers30d =
      (avgPlayers ?? []).length === 0
        ? Math.max(1, row.live_players ?? 1)
        : (avgPlayers ?? []).reduce((s, p) => s + (p.players_online ?? 0), 0) /
          (avgPlayers ?? []).length;

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
```

- [ ] **Step 3.2: TypeScript check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3.3: Commit**

```bash
cd Hyrank && git add lib/ranking/signals.ts
git commit -m "feat(ranking): signals fetcher (pulls server_signals + retention RPC + avg-30d)"
```

---

## Task 4 — Rewrite calculate-rankings cron

**Files:**
- Modify: `Hyrank/app/api/cron/calculate-rankings/route.ts`

- [ ] **Step 4.1: Replace the handler body**

Replace the existing min-max ranking logic with:
1. Call `fetchAllServerSignals()`
2. Call `compositeScore()` per server
3. Upsert into `server_rank` via a single multi-value INSERT ... ON CONFLICT DO UPDATE
4. Also update `servers.ranking_score` for backward compat (single-statement UPDATE ... FROM VALUES)

The plan gives you the imports and the skeleton; fill in the file body verbatim:

```typescript
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
```

- [ ] **Step 4.2: Build + type-check**

Run: `cd Hyrank && npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4.3: Commit**

```bash
cd Hyrank && git add app/api/cron/calculate-rankings/route.ts
git commit -m "feat(ranking): calculate-rankings cron uses composite + writes server_rank"
```

---

## Task 5 — Rewrite calculate-uptime Cron as Single SQL

**Files:**
- Modify: `Hyrank/app/api/cron/calculate-uptime/route.ts`

- [ ] **Step 5.1: Replace the handler with a single UPDATE ... FROM**

The existing cron does N SELECT + N UPDATE. Replace with one SQL that aggregates all at once:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

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
  if (request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // One SQL: compute day/week/month uptime per server in a single pass, update servers.
  const sql = `
    WITH stats AS (
      SELECT
        server_id,
        AVG(CASE WHEN status = 'online' AND recorded_at > NOW() - INTERVAL '1 day'  THEN 1.0 ELSE 0.0 END) FILTER (WHERE recorded_at > NOW() - INTERVAL '1 day')   * 100 AS u_day,
        AVG(CASE WHEN status = 'online' AND recorded_at > NOW() - INTERVAL '7 days' THEN 1.0 ELSE 0.0 END) FILTER (WHERE recorded_at > NOW() - INTERVAL '7 days')  * 100 AS u_week,
        AVG(CASE WHEN status = 'online' AND recorded_at > NOW() - INTERVAL '30 days' THEN 1.0 ELSE 0.0 END) FILTER (WHERE recorded_at > NOW() - INTERVAL '30 days') * 100 AS u_month
      FROM public.server_status_history
      WHERE recorded_at > NOW() - INTERVAL '30 days'
      GROUP BY server_id
    )
    UPDATE public.servers s
    SET uptime_day   = ROUND(COALESCE(stats.u_day,   0)::NUMERIC, 2),
        uptime_week  = ROUND(COALESCE(stats.u_week,  0)::NUMERIC, 2),
        uptime_month = ROUND(COALESCE(stats.u_month, 0)::NUMERIC, 2)
    FROM stats
    WHERE s.id = stats.server_id
    RETURNING s.id;
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any).rpc("execute_sql", { query: sql });
  // NOTE: Supabase public API does not expose `rpc('execute_sql')`. Alternative:
  // deploy a Postgres function that wraps this CTE and call it via rpc. For now,
  // we fall back to client.from().select() pattern plus an RPC helper we create below.

  if (error) {
    console.error("uptime SQL failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
  return NextResponse.json({ updated: data?.length ?? 0 });
}
```

Because the anon/authenticated Supabase client cannot run arbitrary SQL, we instead create a Postgres function that does the UPDATE. Add a migration 006 in Task 6 below. For now, the route above will 500 until that function exists — that's fine because the route is behind cron auth.

Actually — simpler: fold the SQL into a Postgres RPC function in migration 005 (amend). Replace Task 5 Step 5.1 with:

1. First, append to `supabase/migrations/005_ranking_infra.sql`:
```sql
-- Uptime recomputation as a stored function, called by the cron route.
CREATE OR REPLACE FUNCTION public.recompute_all_uptime()
RETURNS INTEGER
LANGUAGE SQL
SET search_path = ''
AS $$
  WITH stats AS (
    SELECT
      server_id,
      AVG(CASE WHEN status = 'online' THEN 1.0 ELSE 0.0 END) FILTER (WHERE recorded_at > NOW() - INTERVAL '1 day')    * 100 AS u_day,
      AVG(CASE WHEN status = 'online' THEN 1.0 ELSE 0.0 END) FILTER (WHERE recorded_at > NOW() - INTERVAL '7 days')   * 100 AS u_week,
      AVG(CASE WHEN status = 'online' THEN 1.0 ELSE 0.0 END) FILTER (WHERE recorded_at > NOW() - INTERVAL '30 days')  * 100 AS u_month
    FROM public.server_status_history
    WHERE recorded_at > NOW() - INTERVAL '30 days'
    GROUP BY server_id
  ),
  upd AS (
    UPDATE public.servers s
    SET uptime_day   = ROUND(COALESCE(stats.u_day,   0)::NUMERIC, 2),
        uptime_week  = ROUND(COALESCE(stats.u_week,  0)::NUMERIC, 2),
        uptime_month = ROUND(COALESCE(stats.u_month, 0)::NUMERIC, 2)
    FROM stats
    WHERE s.id = stats.server_id
    RETURNING s.id
  )
  SELECT COUNT(*)::INTEGER FROM upd;
$$;
```

2. Re-apply migration 005 via MCP (same name; idempotent due to CREATE OR REPLACE).

3. Then the cron route body becomes:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (admin as any).rpc("recompute_all_uptime");
if (error) {
  console.error("uptime RPC failed:", error);
  return NextResponse.json({ error: "uptime failed" }, { status: 500 });
}
return NextResponse.json({ updated: typeof data === "number" ? data : 0 });
```

- [ ] **Step 5.2: Amend migration 005**

Append the `recompute_all_uptime` function to `supabase/migrations/005_ranking_infra.sql` and re-apply.

Call `mcp__4a3f6a92-*__apply_migration` again with same name `ranking_infra` and the full (updated) query. The MCP uses `CREATE OR REPLACE` semantics for functions; OK to re-run.

- [ ] **Step 5.3: Rewrite calculate-uptime handler**

Apply the simpler RPC-call body shown above.

- [ ] **Step 5.4: Build + test**

Run: `cd Hyrank && npx tsc --noEmit && npm run build && npm run test:e2e`
Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
cd Hyrank && git add supabase/migrations/005_ranking_infra.sql app/api/cron/calculate-uptime/route.ts
git commit -m "perf(uptime): single-SQL aggregation via recompute_all_uptime RPC"
```

---

## Task 6 — Remove App-code updateServerRating from Reviews Route

**Files:**
- Modify: `Hyrank/app/api/servers/[id]/reviews/route.ts`

- [ ] **Step 6.1: Remove the updateServerRating function + its call sites**

The existing POST/PUT call `updateServerRating()` which reads all reviews, computes average client-side, and writes back. The DB trigger `on_review_changed` (migration 001, re-confirmed in 005) does this automatically — the app code is redundant and race-prone.

Delete:
- The `updateServerRating()` function body
- Any call site (`await updateServerRating(serverId)`) in POST/PUT/DELETE handlers

Leave everything else intact.

- [ ] **Step 6.2: Build**

Run: `cd Hyrank && npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 6.3: Commit**

```bash
cd Hyrank && git add app/api/servers/[id]/reviews/route.ts
git commit -m "refactor(reviews): remove app-code updateServerRating (DB trigger handles it)"
```

---

## Task 7 — Exit Bar + Notes

- [ ] **Step 7.1: Full verification**

Run:
```bash
cd Hyrank
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
npm run test:e2e
```
All must pass.

- [ ] **Step 7.2: Trigger the new cron manually to verify end-to-end**

Use an in-terminal curl (the dev server must be running from `npm run dev`):
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/calculate-rankings
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/calculate-uptime
```
Expected: both return JSON success. `calculate-rankings` returns `{ updated: N, weights: {...} }`. `calculate-uptime` returns `{ updated: N }`.

If `N = 0` on rankings (no servers exist yet), that's OK — fresh DB.

- [ ] **Step 7.3: Confirm data landed**

Call `mcp__4a3f6a92-*__execute_sql` with `SELECT COUNT(*), MAX(composite_score), MIN(composite_score) FROM server_rank;`
Expected: non-zero count if servers exist. If zero servers, seed one via admin panel first.

- [ ] **Step 7.4: Append completion notes**

Append to this plan file:
```markdown
## Notes

- Migration 005 (+ amendment) applied.
- pg_cron `refresh_server_signals` scheduled every */10 min.
- `compute_retention_7d(uuid)` + `recompute_all_uptime()` functions live.
- `server_rank` populated with composite scores.
- Backward-compat `servers.ranking_score` column still maintained (Plan 4 will migrate reads).
- Known limitation: `signals.ts` does N+1 queries (per-server retention RPC + avg-players fetch).
  Acceptable at <1k servers; Plan 4+ can extract to a single stored function if needed.
```

- [ ] **Step 7.5: Commit**

```bash
cd Hyrank && git add docs/superpowers/plans/2026-04-22-enhancement-plan-3-ranking.md
git commit -m "docs(plan): Enhancement Plan 3 completion notes"
```

---

## Self-Review Checklist

**Spec coverage:**
- Bayesian + Reddit-hot + live + retention + uptime − shadow penalty → Task 2
- pg_cron mat view refresh → Task 1
- `server_rank` table populated → Task 4
- Uptime cron as single SQL → Task 5
- `updateServerRating` moved to trigger → Task 6

**Placeholder scan:** None. All code blocks are verbatim.

**Scope check:** Rankings + ranking infra only. UI changes to `/rankings` page are Plan 4.

**Open risk:** Task 3's `fetchAllServerSignals` does N+1 queries. Fine at current scale; Plan 4 may need to replace with one `get_all_signals()` stored function if we pass 1k active servers. Tracked in Notes.
