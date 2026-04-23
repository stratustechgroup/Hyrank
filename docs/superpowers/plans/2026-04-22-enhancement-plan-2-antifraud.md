# HyRank Enhancement Plan 2 — Anti-Fraud Vote Pipeline + Advisor Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "six sequential SELECT + hard-reject" vote path with a shadow-invalidating, Redis-rate-limited, service-role Edge Function. Remove the remaining Supabase advisor warnings. This lands our #1 competitive differentiator (anti-fraud we can publish about) and clears the security baseline.

**Architecture:** Votes move from `app/api/servers/[id]/vote/route.ts` (thin proxy) → Supabase Edge Function `supabase/functions/vote/index.ts` running with `SUPABASE_SERVICE_ROLE_KEY`. Inside the function, the six DB-query cooldown checks become two Upstash Redis sliding-window calls + a `trust_score` accumulator. Suspicious votes are inserted with `status = 'shadow_invalidated'` and the client always sees `200 OK` — botters can't diagnose which gate tripped them. The partial unique index on `(server_id, user_id, vote_bucket)` (migration 003) enforces the 12h cooldown at the DB layer as the last line of defense. FingerprintJS (already in deps) generates a client-side `visitorId` that the Edge Function hashes with `IP_SALT` before storing.

**Tech Stack additions:**
- `@upstash/ratelimit` + `@upstash/redis` — serverless sliding-window rate limits
- Supabase Edge Function (Deno runtime — not Node) for the vote handler
- FingerprintJS browser integration (package already in repo, not wired up)
- New `lib/anti-fraud/score.ts` trust-score computation module

**Prerequisites (user action before starting):**
1. **Upstash Redis DB created** (free tier works, fill `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in `.env.local` and Supabase Edge Function secrets)
2. **Supabase service_role key** pasted into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` and set in Supabase dashboard → Project Settings → Edge Functions → Secrets
3. **Discord OAuth enabled** in Supabase Auth (so the Edge Function can recognize authenticated voters)

---

## Assumed State from Enhancement Plan 1

- Migration 003 applied (votes has `status` column + `vote_bucket` generated column + partial unique index + INSERT RLS = false)
- `lib/supabase/database.types.ts` exists; `lib/supabase/types.ts` is a re-export shim
- `IP_SALT` asserted at vote route module load (any code reading `process.env.IP_SALT` directly will still work)
- Cron auth fail-closed
- `KNOWN_ISSUES.md` from Plan 1 Task 4 — do NOT fix those here (Plan 4 handles UI null-coalescing)

## Non-Goals (Enhancement Plan 3+)

- Bayesian + Reddit-hot ranking formula → Plan 3
- pg_cron scheduling for `server_signals` refresh → Plan 3
- Server-side rankings page filtering → Plan 3
- 14 gamemode SEO pages → Plan 4
- Owner claim flow → Plan 5
- Real UDP `@hytaleone/query` ping → Plan 6

---

## File Structure

**Created this plan:**
- `Hyrank/supabase/migrations/004_advisor_fixes.sql` — advisor-warning cleanup
- `Hyrank/lib/anti-fraud/score.ts` — pure trust-score computation (testable)
- `Hyrank/lib/anti-fraud/telemetry.ts` — client-side behavioral signal collector
- `Hyrank/lib/supabase/admin.ts` — minimal service-role client for local/dev (Edge Function has its own)
- `Hyrank/supabase/functions/vote/index.ts` — the new vote Edge Function (Deno)
- `Hyrank/supabase/functions/vote/deno.json` — Deno config
- `Hyrank/app/trust/page.tsx` — public moderation log page
- `Hyrank/tests/unit/score.test.ts` — Vitest unit tests for trust-score edge cases

**Modified this plan:**
- `Hyrank/app/api/servers/[id]/vote/route.ts` — becomes a thin proxy that forwards to the Edge Function, preserving existing response shape
- `Hyrank/lib/hooks/useVote.ts` — gathers behavioral telemetry + FingerprintJS visitorId
- `Hyrank/package.json` — add `@upstash/ratelimit`, `@upstash/redis`, `vitest`
- `Hyrank/.env.example` — document Upstash + service-role vars
- `Hyrank/app/layout.tsx` — tiny addition: import FingerprintJS lazy-load helper

---

## Task 1 — Migration 004: Advisor Warning Cleanup

**Files:**
- Create: `Hyrank/supabase/migrations/004_advisor_fixes.sql`

- [ ] **Step 1.1: Write migration 004**

Write `Hyrank/supabase/migrations/004_advisor_fixes.sql`:
```sql
-- Migration 004 -- advisor warning cleanup.
-- Addresses: function_search_path_mutable (5 functions), materialized_view_in_api
-- on server_signals, rls_policy_always_true on bumps.

-- 1. Lock function search_paths (prevents search_path manipulation attacks)
ALTER FUNCTION public.calculate_uptime(UUID, INT) SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.update_vote_count() SET search_path = '';
ALTER FUNCTION public.update_rating_avg() SET search_path = '';

-- 2. Revoke server_signals from public (service-role-only — ranking cron is the sole reader)
REVOKE SELECT ON public.server_signals FROM anon, authenticated;

-- 3. Tighten bumps INSERT RLS: authenticated users with matching user_id, or anon with null user_id
DROP POLICY IF EXISTS "Users can bump" ON bumps;
CREATE POLICY "Authenticated bumps own user_id" ON bumps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
-- Anonymous bumps allowed only with null user_id (rate-limited by IP in app layer).
CREATE POLICY "Anonymous bumps null user_id" ON bumps FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
```

- [ ] **Step 1.2: Apply via Supabase MCP**

Call `mcp__4a3f6a92-*__apply_migration` with:
- `project_id`: `uosmhbirchjudpwtptov`
- `name`: `advisor_fixes`
- `query`: (contents of the file)

Expected: `success: true`.

- [ ] **Step 1.3: Re-run security advisor**

Call `mcp__4a3f6a92-*__get_advisors` with type `security` on project `uosmhbirchjudpwtptov`.
Expected: zero `function_search_path_mutable`, zero `materialized_view_in_api`, zero `rls_policy_always_true`. INFO-level foreign-key-index warnings are OK; defer.

- [ ] **Step 1.4: Commit**

```bash
cd Hyrank && git add supabase/migrations/004_advisor_fixes.sql
git commit -m "db(004): advisor cleanup — function search_paths, revoke server_signals, tighten bumps RLS"
```

---

## Task 2 — Install Upstash + Vitest

- [ ] **Step 2.1: Add dependencies**

Run:
```bash
cd Hyrank && npm install @upstash/ratelimit@2.0 @upstash/redis@1.34
npm install --save-dev vitest@2.1 @vitest/ui@2.1
```

- [ ] **Step 2.2: Add `test` script to package.json**

In `scripts`, add `"test": "vitest"`, `"test:run": "vitest run"`.

- [ ] **Step 2.3: Add Upstash env vars to `.env.example`**

Append:
```
# Upstash Redis (anti-fraud rate-limiting)
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

- [ ] **Step 2.4: Commit**

```bash
cd Hyrank && git add package.json package-lock.json .env.example
git commit -m "chore: add Upstash Redis + Vitest dev deps"
```

---

## Task 3 — Trust Score Computation Library

**Files:**
- Create: `Hyrank/lib/anti-fraud/score.ts`
- Create: `Hyrank/lib/anti-fraud/telemetry.ts`

- [ ] **Step 3.1: Write the trust-score module**

Write `Hyrank/lib/anti-fraud/score.ts`:
```typescript
/**
 * Trust score computation — pure, testable, no I/O.
 * Inputs come from: session (Discord OAuth), headers (IP/UA), client telemetry,
 * Redis state (fingerprint already seen? IP bucket exceeded?).
 * Output: numeric score 0-100. Status derived at call site:
 *   score >= 40 -> 'valid'
 *   score <  40 -> 'shadow_invalidated'  (always return 200 to client)
 */
export interface TrustScoreInputs {
  /** seconds since Discord account creation; undefined if not authed */
  accountAgeSeconds?: number;
  /** did FingerprintJS visitorId already vote this server in the 12h bucket? */
  fingerprintFresh: boolean;
  /** did IP sliding window (5 votes / 10min) exceed? */
  ipBucketOk: boolean;
  /** 0-1 measure of mouse entropy during page visit */
  mouseEntropy: number;
  /** milliseconds the user spent on the page before clicking vote */
  dwellMs: number;
  /** was the tab visible for the entire dwell? */
  tabWasVisible: boolean;
}

const SEVEN_DAYS_SEC = 7 * 24 * 3600;

export function computeTrustScore(inputs: TrustScoreInputs): number {
  let score = 50;

  // Account age: Discord accounts < 7 days old are suspicious
  if (inputs.accountAgeSeconds !== undefined && inputs.accountAgeSeconds < SEVEN_DAYS_SEC) {
    score -= 20;
  }

  // Fingerprint re-use in same 12h window: strong fraud signal
  if (!inputs.fingerprintFresh) score -= 40;

  // IP rate limit exceeded
  if (!inputs.ipBucketOk) score -= 30;

  // Behavioral: mouse entropy contributes up to +20, cap at 20
  score += Math.min(Math.max(inputs.mouseEntropy, 0) * 20, 20);

  // Dwell time: > 3s = likely human, < 500ms = bot
  if (inputs.dwellMs > 3000) score += 15;
  else if (inputs.dwellMs < 500) score -= 30;

  // Tab visibility: hidden tabs during vote is suspicious
  score += inputs.tabWasVisible ? 5 : -15;

  return Math.max(0, Math.min(100, score));
}

export function verdictFromScore(score: number): "valid" | "shadow_invalidated" {
  return score >= 40 ? "valid" : "shadow_invalidated";
}
```

- [ ] **Step 3.2: Write the client-side telemetry collector**

Write `Hyrank/lib/anti-fraud/telemetry.ts`:
```typescript
"use client";

/**
 * Runs for the lifetime of a client page view. Accumulates simple behavioral
 * signals we later send with the vote POST. No PII; no persistence.
 */
export interface BehavioralTelemetry {
  mouseEntropy: number;   // 0-1 (coverage of the viewport)
  dwellMs: number;        // time since first interaction
  tabWasVisible: boolean; // was tab visible the whole time
}

export function initTelemetry(): () => BehavioralTelemetry {
  const startedAt = Date.now();
  const cells = new Set<string>();
  let tabHiddenOnce = document.visibilityState === "hidden";

  function onMove(e: MouseEvent) {
    // 32 buckets per axis -> 1024 cells total, ratio gives entropy 0-1
    const x = Math.floor((e.clientX / window.innerWidth) * 32);
    const y = Math.floor((e.clientY / window.innerHeight) * 32);
    cells.add(`${x}:${y}`);
  }
  function onVis() {
    if (document.visibilityState === "hidden") tabHiddenOnce = true;
  }
  window.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVis);

  return () => {
    window.removeEventListener("mousemove", onMove);
    document.removeEventListener("visibilitychange", onVis);
    return {
      mouseEntropy: Math.min(cells.size / 1024, 1),
      dwellMs: Date.now() - startedAt,
      tabWasVisible: !tabHiddenOnce,
    };
  };
}
```

- [ ] **Step 3.3: Write vitest config + unit tests**

Write `Hyrank/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
```

Write `Hyrank/tests/unit/score.test.ts`:
```typescript
import { describe, test, expect } from "vitest";
import { computeTrustScore, verdictFromScore } from "@/lib/anti-fraud/score";

describe("computeTrustScore", () => {
  const baseline = {
    accountAgeSeconds: 60 * 24 * 3600,
    fingerprintFresh: true,
    ipBucketOk: true,
    mouseEntropy: 0.5,
    dwellMs: 4000,
    tabWasVisible: true,
  };

  test("baseline human-ish voter scores above 40", () => {
    expect(computeTrustScore(baseline)).toBeGreaterThanOrEqual(40);
  });

  test("fingerprint re-use crushes score", () => {
    const score = computeTrustScore({ ...baseline, fingerprintFresh: false });
    expect(score).toBeLessThan(40);
    expect(verdictFromScore(score)).toBe("shadow_invalidated");
  });

  test("sub-500ms dwell is bot-like", () => {
    const score = computeTrustScore({ ...baseline, dwellMs: 200 });
    expect(score).toBeLessThan(40);
  });

  test("score clamps to [0,100]", () => {
    const worst = {
      accountAgeSeconds: 0,
      fingerprintFresh: false,
      ipBucketOk: false,
      mouseEntropy: 0,
      dwellMs: 0,
      tabWasVisible: false,
    };
    expect(computeTrustScore(worst)).toBeGreaterThanOrEqual(0);
    const best = {
      accountAgeSeconds: 365 * 24 * 3600,
      fingerprintFresh: true,
      ipBucketOk: true,
      mouseEntropy: 1,
      dwellMs: 30_000,
      tabWasVisible: true,
    };
    expect(computeTrustScore(best)).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 3.4: Run tests**

Run: `cd Hyrank && npm run test:run`
Expected: 4/4 pass.

- [ ] **Step 3.5: Commit**

```bash
cd Hyrank && git add lib/anti-fraud/ tests/unit/score.test.ts vitest.config.ts
git commit -m "feat(anti-fraud): trust-score computation library + behavioral telemetry + unit tests"
```

---

## Task 4 — Supabase Edge Function: vote

**Files:**
- Create: `Hyrank/supabase/functions/vote/index.ts`
- Create: `Hyrank/supabase/functions/vote/deno.json`

- [ ] **Step 4.1: Write the Edge Function**

Write `Hyrank/supabase/functions/vote/index.ts`:
```typescript
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Ratelimit } from "npm:@upstash/ratelimit@2.0";
import { Redis } from "npm:@upstash/redis@1.34";

type VerdictStatus = "valid" | "shadow_invalidated";

interface VoteBody {
  serverId: string;
  visitorId?: string;
  username?: string;
  telemetry?: {
    mouseEntropy?: number;
    dwellMs?: number;
    tabWasVisible?: boolean;
  };
}

const redis = Redis.fromEnv();
const ipLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "hyrank:vote:ip",
});

const IP_SALT = Deno.env.get("IP_SALT");
if (!IP_SALT) throw new Error("IP_SALT required");

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function computeTrustScore(inputs: {
  accountAgeSeconds?: number;
  fingerprintFresh: boolean;
  ipBucketOk: boolean;
  mouseEntropy: number;
  dwellMs: number;
  tabWasVisible: boolean;
}): number {
  let s = 50;
  const SEVEN_DAYS = 7 * 24 * 3600;
  if (inputs.accountAgeSeconds !== undefined && inputs.accountAgeSeconds < SEVEN_DAYS) s -= 20;
  if (!inputs.fingerprintFresh) s -= 40;
  if (!inputs.ipBucketOk) s -= 30;
  s += Math.min(Math.max(inputs.mouseEntropy, 0) * 20, 20);
  if (inputs.dwellMs > 3000) s += 15;
  else if (inputs.dwellMs < 500) s -= 30;
  s += inputs.tabWasVisible ? 5 : -15;
  return Math.max(0, Math.min(100, s));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Optional: use the user token to get identity
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  let userId: string | null = null;
  let accountAgeSeconds: number | undefined;
  if (bearer) {
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await authed.auth.getUser();
    if (data.user) {
      userId = data.user.id;
      const created = data.user.created_at ? new Date(data.user.created_at).getTime() : 0;
      accountAgeSeconds = created ? Math.floor((Date.now() - created) / 1000) : undefined;
    }
  }

  const body: VoteBody = await req.json().catch(() => ({} as VoteBody));
  if (!body.serverId) return Response.json({ error: "serverId required" }, { status: 400 });

  const ipHeader = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
  const ip = ipHeader.split(",")[0].trim() || "unknown";
  const ipHash = (await sha256Hex(ip + IP_SALT)).slice(0, 48);
  const ua = req.headers.get("user-agent") ?? "";
  const uaHash = (await sha256Hex(ua)).slice(0, 32);

  // Layer 2: fingerprint dedupe (12h) using visitorId
  let fingerprintFresh = true;
  if (body.visitorId) {
    const fpKey = `hyrank:fp:${body.serverId}:${body.visitorId}`;
    const set = await redis.set(fpKey, "1", { nx: true, ex: 43_200 });
    fingerprintFresh = set === "OK";
  }

  // Layer 3: IP sliding window
  const { success: ipBucketOk } = await ipLimit.limit(`${ipHash}:${body.serverId}`);

  const t = body.telemetry ?? {};
  const trust = computeTrustScore({
    accountAgeSeconds,
    fingerprintFresh,
    ipBucketOk,
    mouseEntropy: t.mouseEntropy ?? 0,
    dwellMs: t.dwellMs ?? 0,
    tabWasVisible: t.tabWasVisible ?? true,
  });
  const status: VerdictStatus = trust >= 40 ? "valid" : "shadow_invalidated";

  // DB insert. The partial unique index (migration 003) provides the final
  // defense: if a valid row already exists in this 12h bucket for (server_id, user_id),
  // the insert errors and we downgrade to shadow on the retry.
  const insertRow = {
    server_id: body.serverId,
    user_id: userId,
    ip_hash: ipHash,
    ua_hash: uaHash,
    visitor_id: body.visitorId ?? null,
    user_agent: ua,
    trust_score: trust,
    status,
    source: "web",
  };

  const { data: inserted, error } = await admin
    .from("votes")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) {
    // unique_violation (23505) — user already voted valid in this 12h bucket
    if ((error as any).code === "23505") {
      await admin.from("votes").insert({ ...insertRow, status: "shadow_invalidated" });
      // Still return 200 — never teach botters.
    } else {
      console.error("vote insert failed:", error);
      return Response.json({ error: "insert failed" }, { status: 500 });
    }
  }

  return Response.json({ ok: true, voteId: inserted?.id ?? null });
});
```

- [ ] **Step 4.2: Write deno.json config**

Write `Hyrank/supabase/functions/vote/deno.json`:
```json
{
  "imports": {
    "@supabase/supabase-js": "jsr:@supabase/supabase-js@2",
    "@upstash/ratelimit": "npm:@upstash/ratelimit@2.0",
    "@upstash/redis": "npm:@upstash/redis@1.34"
  }
}
```

- [ ] **Step 4.3: Deploy via MCP**

Call `mcp__4a3f6a92-*__deploy_edge_function` with:
- `project_id`: `uosmhbirchjudpwtptov`
- `name`: `vote`
- `verify_jwt`: `false` (anon voting allowed — we authenticate inside the function based on optional Bearer token)
- `entrypoint_path`: `index.ts`
- `files`: array of two — the two files above with their exact contents

Expected: `success`.

- [ ] **Step 4.4: Set Edge Function secrets (USER ACTION)**

Document at the bottom of this plan: the user must set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `IP_SALT`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` via Supabase Dashboard → Project Settings → Edge Functions → Secrets (or `supabase secrets set`). The function will 500 at import time otherwise (which is the intended fail-closed behavior).

- [ ] **Step 4.5: Commit**

```bash
cd Hyrank && git add supabase/functions/vote/
git commit -m "feat(vote): Supabase Edge Function with shadow invalidation + Upstash rate limit"
```

---

## Task 5 — Rewrite Vote Route as Thin Proxy

**Files:**
- Modify: `Hyrank/app/api/servers/[id]/vote/route.ts`

- [ ] **Step 5.1: Replace the POST handler**

The existing POST does 6 sequential SELECTs + admin INSERT. Replace with a thin forward to the Edge Function that preserves the existing client contract (`{success, voteId, message, nextVoteAt}`).

Rewrite `app/api/servers/[id]/vote/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: serverId } = await params;
  const body = await request.json().catch(() => ({}));

  const authHeader = request.headers.get("authorization") ?? "";

  const res = await fetch(`${SUPABASE_URL}/functions/v1/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward auth header so the Edge Function can getUser()
      ...(authHeader ? { Authorization: authHeader } : { Authorization: `Bearer ${ANON_KEY}` }),
      // Forward IP so the Edge Function hashes the real client IP
      "x-forwarded-for":
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "",
      "user-agent": request.headers.get("user-agent") ?? "",
    },
    body: JSON.stringify({ serverId, ...body }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? "vote failed" }, { status: res.status });
  }
  return NextResponse.json({
    success: true,
    voteId: data.voteId ?? null,
    message: "Vote recorded successfully!",
    nextVoteAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
  });
}

// Keep the existing GET endpoint for cooldown status until Plan 3 replaces it
// with a client-side Upstash check.
export { GET } from "./_legacy-get";
```

- [ ] **Step 5.2: Extract legacy GET handler**

The existing file has a GET endpoint checking cooldown. Move it into `app/api/servers/[id]/vote/_legacy-get.ts` (export only `GET`). This preserves behavior while we transition.

Copy the `export async function GET(...)` block from the original file into the new `_legacy-get.ts` file, untouched.

- [ ] **Step 5.3: Build**

Run: `cd Hyrank && npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5.4: Commit**

```bash
cd Hyrank && git add app/api/servers/[id]/vote/
git commit -m "feat(vote): route becomes thin proxy to Edge Function (preserves client contract)"
```

---

## Task 6 — Wire Behavioral Telemetry + FingerprintJS into useVote

**Files:**
- Modify: `Hyrank/lib/hooks/useVote.ts`

- [ ] **Step 6.1: Update useVote to initialize telemetry + fingerprint on mount**

Inject a `useEffect` that:
1. Lazy-loads FingerprintJS (`@fingerprintjs/fingerprintjs` already in deps), calls `.load()` then `.get()` to obtain a `visitorId`.
2. Initializes the `initTelemetry()` collector on mount, stashes the teardown callback in a ref.

In the existing `vote()` function, call the teardown to get telemetry, then POST with `{ visitorId, username?, telemetry }` body.

Full refactor is small; preserve the existing return shape.

- [ ] **Step 6.2: Build + type-check**

Run: `cd Hyrank && npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 6.3: Commit**

```bash
cd Hyrank && git add lib/hooks/useVote.ts
git commit -m "feat(vote): useVote now sends FingerprintJS visitorId + behavioral telemetry"
```

---

## Task 7 — Public /trust Moderation Log Page

**Files:**
- Create: `Hyrank/app/trust/page.tsx`
- Create: `Hyrank/app/trust/TrustStats.tsx`

- [ ] **Step 7.1: Write the page (RSC)**

`app/trust/page.tsx` renders an RSC that reads weekly aggregate stats from `moderation_log` via the server Supabase client (only public-readable rows). Show:
- Total shadow-invalidated votes this week
- Total servers demoted this week
- Total users flagged this week
- A transparency narrative: "HyRank publishes this so you can verify we're actually fighting fraud — unlike listing sites that hide their moderation"

Also include a link to our anti-fraud methodology doc (TBD in Plan 5).

Use existing design system tokens (`glass-card`, `btn-primary`, `text-gradient`). NO references to legacy-drift tokens like `void-*` or `legendary-*`.

Full code left intentionally to the implementer — the primitives exist in `lib/supabase/server.ts` + `lib/seo/metadata.ts`. Under 150 lines.

- [ ] **Step 7.2: Add to sitemap + metadata**

Add `/trust` to `app/sitemap.ts` static entries. Add Open Graph metadata in the page's `generateMetadata()`.

- [ ] **Step 7.3: Smoke test**

Add one line to `tests/e2e/smoke.spec.ts`:
```typescript
test("/trust renders moderation log", async ({ page }) => {
  await page.goto("/trust");
  await expect(page.locator("body")).toContainText(/moderation|shadow.invalidated|trust/i);
});
```

- [ ] **Step 7.4: Build + test**

Run: `cd Hyrank && npm run build && npm run test:e2e`
Expected: 5/5 pass.

- [ ] **Step 7.5: Commit**

```bash
cd Hyrank && git add app/trust/ app/sitemap.ts tests/e2e/smoke.spec.ts
git commit -m "feat(trust): public /trust page shows weekly anti-fraud stats from moderation_log"
```

---

## Task 8 — Exit Bar Verification + Notes

- [ ] **Step 8.1: Full verification**

Run in sequence:
```bash
cd Hyrank
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
npm run test:e2e
```
All must pass.

- [ ] **Step 8.2: Re-run advisors**

Call `mcp__4a3f6a92-*__get_advisors` with both `security` and `performance`. Expected: zero new ERROR/WARN for what we fixed. INFO-level FK-index warnings are acceptable.

- [ ] **Step 8.3: Append Notes section to this plan**

Record:
- Supabase Edge Function `vote` deployed version number
- Upstash Redis database region + name
- Any test instability found
- Discord-OAuth confirmation (user must actually test this manually once)

- [ ] **Step 8.4: Commit**

```bash
cd Hyrank && git add docs/superpowers/plans/2026-04-22-enhancement-plan-2-antifraud.md
git commit -m "docs(plan): Enhancement Plan 2 completion notes"
```

---

## Self-Review Checklist

**Spec coverage:** All 15 audit-surfaced anti-fraud gaps that were earmarked for Plan 2 are addressed: shadow invalidation (Task 4), Upstash rate-limiting (Task 4), 12h DB cooldown (from migration 003 + reliance in Task 4), behavioral telemetry (Tasks 3 + 6), service-role-only INSERT (Task 4), FingerprintJS SDK integration (Task 6), function search_path (Task 1), mat view exposure (Task 1), bumps RLS (Task 1), public moderation log (Task 7).

**Placeholder scan:** Task 7's page body is intentionally sketched rather than verbatim — the implementer must pattern-match existing RSC pages. Acceptable because the primitives exist.

**Type consistency:** All types reference `lib/supabase/database.types.ts` via the shim from Plan 1.

**Scope check:** Plan is focused on anti-fraud. Ranking formula (Bayesian + hot) is NOT here — that's Plan 3. 14 gamemode pages NOT here — Plan 4.

## Prerequisites (reminder for human)

1. Upstash Redis DB created, connection string + token added to `.env.local` AND Supabase Edge Function secrets
2. `SUPABASE_SERVICE_ROLE_KEY` pasted into `.env.local` and set as Edge Function secret
3. Discord provider enabled in Supabase Auth with Client ID + Secret from Discord Dev Portal
