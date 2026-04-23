# HyRank Enhancement Plan 1 — Security Hygiene + Foundation Alignment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Supersedes:** the original `2026-04-22-phase1-foundation.md` plan (which assumed a greenfield build — reality is the project is ~70% built with a mature Supabase-backed app already).

**Goal:** Close the critical security bugs surfaced in the 5-agent audit, align the TypeScript types with the freshly-applied Phase 1 schema on Supabase project `uosmhbirchjudpwtptov`, and leave the app in a verified-builds-and-type-checks state so Enhancement Plans 2–6 can proceed on solid ground.

**Architecture:** We apply targeted, surgical fixes — no rewrites. All new code lives alongside existing patterns; we only update `lib/supabase/types.ts` to re-export the generated `Database` type from `lib/supabase/database.types.ts` so downstream callers get schema truth from one source. Security fixes are minimal-diff: fail-closed env checks on crons, assert IP salt, add `/admin` to robots, sanitize the one PostgREST injection vector, and switch the vote INSERT path from the user-scoped client to the admin client (now that RLS blocks anon INSERT per migration 003).

**Tech Stack (already in repo):** Next.js 14 App Router, TypeScript strict, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Tailwind, Framer Motion, FingerprintJS, Stripe (Phase 2), Vercel Analytics.

---

## Assumed State (already landed in prior work on this branch)

- ✅ Branch `claude/hyrank-phase1-enhancement` exists; middleware mistake reverted.
- ✅ Supabase project `hyrank` (ref `uosmhbirchjudpwtptov`, us-east-1, ACTIVE_HEALTHY) created in org `Stratus Tech Group`.
- ✅ Migrations 001, 002, 003 applied via Supabase MCP.
- ✅ Advisors run: 5 function search_path WARNs, 1 materialized_view_in_api WARN, 1 permissive RLS WARN on `bumps` — all addressed by Enhancement Plan 2; nothing P0 here.
- ✅ `Hyrank/lib/supabase/database.types.ts` written from generated types.
- ✅ `Hyrank/supabase/migrations/003_phase1_enhancements.sql` saved to repo.
- ✅ `Hyrank/.env.local` written with real Supabase URL + anon + publishable keys + generated IP_SALT / CRON_SECRET.
- ✅ Playwright + Supabase CLI + dotenv-cli dev deps installed (commit `db95fae`).

## Non-Goals (Enhancement Plan 2+)

- Shadow-invalidation vote pipeline → Plan 2
- Bayesian + Reddit-hot ranking formula → Plan 2
- Upstash Redis rate-limit plumbing → Plan 2
- 14 gamemode SEO pages → Plan 3
- Owner claim flow (MOTD/ingame) → Plan 4
- CurseForge mod picker → Plan 4
- Design token reconciliation → Plan 4
- Real UDP `@hytaleone/query` ping → Plan 5
- HyRank Vote Plugin (Java) → Plan 6

---

## File Structure

**Modified this plan:**
- `Hyrank/lib/supabase/types.ts` — re-export `Database`-derived row types from `database.types.ts`
- `Hyrank/app/api/cron/calculate-rankings/route.ts` — fail-closed cron auth
- `Hyrank/app/api/cron/calculate-uptime/route.ts` — fail-closed cron auth
- `Hyrank/app/api/cron/ping-servers/route.ts` — fail-closed cron auth
- `Hyrank/app/api/servers/[id]/vote/route.ts` — assert IP_SALT, confirm admin client usage
- `Hyrank/app/robots.ts` — add `/admin/` to disallow
- `Hyrank/lib/supabase/queries.ts` — sanitize `searchServers` `.or()` filter
- `Hyrank/app/sitemap.ts` — use server Supabase client instead of browser client
- `Hyrank/lib/supabase/server.ts` — alias `SUPABASE_SERVICE_KEY` ↔ `SUPABASE_SERVICE_ROLE_KEY` for env var hygiene

**Created this plan:**
- (none — this plan is surgical)

**Untouched this plan (by design):**
- `app/page.tsx`, `app/server/[id]/page.tsx`, `app/rankings/page.tsx`, all `components/*` — handled in Plans 3/4
- `lib/auth/AuthContext.tsx` — already supports Discord OAuth, user just needs to enable provider in Supabase dashboard + paste Client ID/Secret

---

## Task 1 — Assert IP_SALT, Remove Insecure Default

**Files:**
- Modify: `Hyrank/app/api/servers/[id]/vote/route.ts:26`

- [ ] **Step 1.1: Read the current IP_SALT line**

Run: `grep -n "IP_SALT" Hyrank/app/api/servers/[id]/vote/route.ts`
Expected: line 26 shows `const IP_SALT = process.env.IP_SALT || "default-salt-change-me";`

- [ ] **Step 1.2: Replace with a fail-closed assertion at module load**

Change line 26 from:
```typescript
const IP_SALT = process.env.IP_SALT || "default-salt-change-me";
```
to:
```typescript
const IP_SALT = process.env.IP_SALT;
if (!IP_SALT) {
  throw new Error("IP_SALT env var is required for vote hashing — refusing to start");
}
```

Note: this uses module-load-time throwing because the value is captured in a top-level `const`. If the module ever loads without `IP_SALT`, the route errors at import rather than silently hashing with a rainbow-able default.

- [ ] **Step 1.3: Run TypeScript check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: PASS. The `hashIP(ip: string)` function used `IP_SALT` directly — TypeScript now narrows it from `string | undefined` → `string` after the `throw`.

If TS complains about `hashIP` seeing `string | undefined`, hoist the assertion inside `hashIP` or cast after the assertion.

- [ ] **Step 1.4: Commit**

```bash
cd Hyrank && git add app/api/servers/[id]/vote/route.ts
git commit -m "fix(vote): fail-closed if IP_SALT env var missing (removes rainbow-table-able default)"
```

---

## Task 2 — Fail-Closed Cron Auth (3 routes)

**Files:**
- Modify: `Hyrank/app/api/cron/calculate-rankings/route.ts`
- Modify: `Hyrank/app/api/cron/calculate-uptime/route.ts`
- Modify: `Hyrank/app/api/cron/ping-servers/route.ts`

- [ ] **Step 2.1: Identify the current auth pattern**

Run: `grep -n "CRON_SECRET" Hyrank/app/api/cron/*/route.ts`
Expected: each route has a line of the form
```typescript
if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
This silently allows all requests through when `CRON_SECRET` is unset in the environment — a prod foot-gun.

- [ ] **Step 2.2: Update `calculate-rankings`**

In `Hyrank/app/api/cron/calculate-rankings/route.ts`, replace the auth block with:
```typescript
const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  return NextResponse.json(
    { error: "CRON_SECRET not configured on server" },
    { status: 500 },
  );
}
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
(Keep the rest of the file untouched. `authHeader` must still be read from `request.headers.get("authorization")` — that line already exists.)

- [ ] **Step 2.3: Apply the same change to `calculate-uptime`**

Mirror step 2.2 verbatim into `Hyrank/app/api/cron/calculate-uptime/route.ts`.

- [ ] **Step 2.4: Apply the same change to `ping-servers`**

Mirror step 2.2 verbatim into `Hyrank/app/api/cron/ping-servers/route.ts`.

- [ ] **Step 2.5: Run TypeScript check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 2.6: Commit**

```bash
cd Hyrank && git add app/api/cron/
git commit -m "fix(cron): fail-closed on missing CRON_SECRET (was silently authorized)"
```

---

## Task 3 — Add `/admin/` to robots.ts disallow

**Files:**
- Modify: `Hyrank/app/robots.ts`

- [ ] **Step 3.1: Read the file**

Run: `cat Hyrank/app/robots.ts`
Expected: disallow list has `/api/`, `/dashboard/`, `/profile/`, `/settings/`, `/_next/` — `/admin/` is missing.

- [ ] **Step 3.2: Add `/admin/` to the disallow array**

Insert `"/admin/",` into the `disallow` array alongside the existing entries.

- [ ] **Step 3.3: Commit**

```bash
cd Hyrank && git add app/robots.ts
git commit -m "fix(seo): disallow /admin/ in robots.txt (admin submissions page was indexable)"
```

---

## Task 4 — Align `lib/supabase/types.ts` with Generated `database.types.ts`

This is the type-alignment task. The hand-written `types.ts` has drift (has `country` when the SQL didn't — now matches via migration 003; missing `ip_addresses/flagged/flag_reason` on `profiles`; missing `featured_auctions` table entirely). Rather than dual-maintain, we pivot `types.ts` to re-export from the generated source of truth.

**Files:**
- Modify: `Hyrank/lib/supabase/types.ts`

- [ ] **Step 4.1: Inspect current exports of `types.ts`**

Run: `grep -E "^export " Hyrank/lib/supabase/types.ts`
Expected: exports include `Database` interface and likely named helpers. Inventory them before rewriting so we can preserve what callers use.

- [ ] **Step 4.2: Find callers**

Run: `grep -rn "from '@/lib/supabase/types'" Hyrank/app Hyrank/lib Hyrank/components 2>/dev/null | grep -v node_modules`
And: `grep -rn "from '@/lib/supabase'" Hyrank/app Hyrank/lib Hyrank/components 2>/dev/null | grep -v node_modules`

Record: which files import `Database`, which import other symbols from `types.ts`.

- [ ] **Step 4.3: Rewrite `lib/supabase/types.ts` as a re-export shim**

Overwrite `Hyrank/lib/supabase/types.ts` with:
```typescript
/**
 * Source-of-truth types come from ./database.types.ts (generated by Supabase MCP).
 * This file re-exports the Database type and common row helpers so existing
 * callers that imported from "@/lib/supabase/types" continue to work unchanged.
 * When regenerating types, run `mcp__4a3f6a92-*__generate_typescript_types`
 * and overwrite database.types.ts — this file does not need edits.
 */
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from "./database.types";
import type { Database } from "./database.types";

// Legacy convenience aliases used by older call sites.
export type ServerRow = Database["public"]["Tables"]["servers"]["Row"];
export type VoteRow = Database["public"]["Tables"]["votes"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SavedServerRow = Database["public"]["Tables"]["saved_servers"]["Row"];
export type GamemodeRow = Database["public"]["Tables"]["gamemodes"]["Row"];
export type TagRow = Database["public"]["Tables"]["tags"]["Row"];
export type ServerOwnerRow = Database["public"]["Tables"]["server_owners"]["Row"];
export type ServerRankRow = Database["public"]["Tables"]["server_rank"]["Row"];
export type ServerSignalsView = Database["public"]["Views"]["server_signals"]["Row"];
```

- [ ] **Step 4.4: Remove hand-written `Database` interface body**

If the original file had a full hand-written `Database` interface, it is now superseded by the re-export. No need to keep it.

- [ ] **Step 4.5: Build + type-check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: likely some minor drift errors because the generated types are stricter (nullable columns that the hand-written version treated as non-null, or vice versa). Fix the 3–5 most-likely-to-error callers inline.

Common patterns:
- `server.ranking_score` — was `number`, now `number | null` → add `?? 0` at read sites
- `profile.username` — now `string | null` → handle null in UI
- Any `as ServerRow` cast that read an unrelated column — may need to use the view/join types

If more than 10 errors, STATUS: BLOCKED — break into a second pass.

- [ ] **Step 4.6: Commit**

```bash
cd Hyrank && git add lib/supabase/types.ts app/ lib/ components/
git commit -m "refactor(types): lib/supabase/types.ts now re-exports from generated database.types.ts"
```

---

## Task 5 — Fix Sitemap to Use Server Client

**Files:**
- Modify: `Hyrank/app/sitemap.ts`

- [ ] **Step 5.1: Read the current sitemap**

Run: `cat Hyrank/app/sitemap.ts`
Expected: imports `createBrowserSupabaseClient` from `@/lib/supabase/client` (or similar). This is wrong — a sitemap route runs server-side and should use the server client.

- [ ] **Step 5.2: Replace with server client usage**

Change the import to `createServerSupabaseClient` from `@/lib/supabase/server`. Since that factory is `async`, wrap the call: `const supabase = await createServerSupabaseClient();` at the top of the `sitemap()` function, and check for null:
```typescript
if (!supabase) return staticEntries;
```

Preserve all static entries + dynamic query logic. Only the client creation call changes.

- [ ] **Step 5.3: Build + test**

Run: `cd Hyrank && npx tsc --noEmit && curl -s http://localhost:3000/sitemap.xml 2>/dev/null | head -20` (only if dev server is running; skip if not).

Expected: type-check passes. Sitemap renders if server is running.

- [ ] **Step 5.4: Commit**

```bash
cd Hyrank && git add app/sitemap.ts
git commit -m "fix(seo): sitemap.ts uses server Supabase client (was using browser client in server context)"
```

---

## Task 6 — Sanitize `searchServers` `.or()` Filter (PostgREST Injection)

**Files:**
- Modify: `Hyrank/lib/supabase/queries.ts`

- [ ] **Step 6.1: Find the current function**

Run: `grep -n "searchServers\|\\.or(" Hyrank/lib/supabase/queries.ts`

Expected: a function `searchServers(query: string)` that builds a filter like `.or("name.ilike.%${query}%,description.ilike.%${query}%")` — unescaped interpolation of a user-supplied string. A query containing `,` or `)` breaks the filter expression.

- [ ] **Step 6.2: Add a sanitizer helper**

Before `searchServers`, add:
```typescript
/** PostgREST .or()/.ilike() filters use commas/parens as syntax — strip or escape. */
function sanitizePostgRESTValue(s: string): string {
  // Remove PostgREST-reserved chars: , ( ) :
  return s.replace(/[,():]/g, "").slice(0, 100);
}
```

- [ ] **Step 6.3: Use the sanitizer in the existing `searchServers` call**

Replace the interpolation with:
```typescript
const safe = sanitizePostgRESTValue(query);
const pattern = `%${safe}%`;
// Then use pattern in the .or() filter
```

Actual implementation varies; preserve the rest of the function. The key is: no raw `${query}` inside a `.or(...)` string argument.

- [ ] **Step 6.4: Build + type-check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6.5: Commit**

```bash
cd Hyrank && git add lib/supabase/queries.ts
git commit -m "fix(queries): sanitize searchServers .or() to prevent PostgREST filter injection"
```

---

## Task 7 — Vote Route: Confirm Admin-Client INSERT Path

Migration 003 tightened the votes RLS to `FOR INSERT WITH CHECK (false)`, so user-scoped clients can no longer insert. The existing code already uses `createAdminSupabaseClient()` for the INSERT — we need to verify that, document it with a comment explaining *why*, and ensure the admin client is not null-guarded in a way that silently skips INSERT.

**Files:**
- Modify: `Hyrank/app/api/servers/[id]/vote/route.ts`

- [ ] **Step 7.1: Verify the admin client is used for the INSERT**

Run: `grep -nB2 -A5 "from(\"votes\").insert" Hyrank/app/api/servers/[id]/vote/route.ts`
Expected: the `.from("votes").insert(...)` is called on a variable derived from `adminSupabase` (not `supabase`, the user-scoped one).

If the INSERT is on `supabase` (user-scoped), change it to `adminSupabase`. Votes can NOT be inserted via the anon or authenticated roles after migration 003.

- [ ] **Step 7.2: Add a comment documenting the RLS requirement**

Immediately above the `.insert({ ... })` call, add:
```typescript
// Votes RLS is `WITH CHECK (false)` for anon + authenticated (migration 003).
// This INSERT must use the service-role admin client. Enhancement Plan 2 will
// move this into a Supabase Edge Function with the full anti-fraud pipeline.
```

- [ ] **Step 7.3: Confirm the early-out for missing admin client is correct**

Near the top of the handler, there should be a check: if `!adminSupabase`, return 503. If it's missing (not `!adminSupabase`, or unconditional), add it. Don't silently skip the INSERT.

- [ ] **Step 7.4: Build + type-check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
cd Hyrank && git add app/api/servers/[id]/vote/route.ts
git commit -m "fix(vote): document admin-client INSERT requirement (RLS service-role-only)"
```

---

## Task 8 — Env Var Hygiene: `SUPABASE_SERVICE_KEY` ↔ `SUPABASE_SERVICE_ROLE_KEY`

`lib/supabase/server.ts` reads `process.env.SUPABASE_SERVICE_KEY`. The Supabase canonical env var is `SUPABASE_SERVICE_ROLE_KEY`. Cron / Edge Function examples in docs use the canonical name. Support both to reduce friction.

**Files:**
- Modify: `Hyrank/lib/supabase/server.ts`
- Modify: `Hyrank/.env.example`

- [ ] **Step 8.1: Update `createAdminSupabaseClient` to accept either env var**

In `Hyrank/lib/supabase/server.ts`, find the line reading the service key. Replace:
```typescript
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
```
with:
```typescript
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY;
```

Same in the `isAdminSupabaseConfigured` helper.

- [ ] **Step 8.2: Update `.env.example`**

Add:
```
# Either name works; SUPABASE_SERVICE_ROLE_KEY is canonical.
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
# SUPABASE_SERVICE_KEY=your_service_role_key_here  # legacy alias
```

Remove the old `SUPABASE_SERVICE_KEY=...` line.

- [ ] **Step 8.3: Build + type-check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8.4: Commit**

```bash
cd Hyrank && git add lib/supabase/server.ts .env.example
git commit -m "chore(env): support SUPABASE_SERVICE_ROLE_KEY (canonical) alongside SUPABASE_SERVICE_KEY"
```

---

## Task 9 — Full Build + Lint Verification

- [ ] **Step 9.1: Run lint**

Run: `cd Hyrank && npm run lint`
Expected: no new errors. Pre-existing eslint warnings OK.

- [ ] **Step 9.2: Run the Next.js build**

Run: `cd Hyrank && npm run build`
Expected: build succeeds. Any new build errors from the type alignment in Task 4 must be fixed inline before moving on.

- [ ] **Step 9.3: If build fails, triage**

- If the error is in code not touched by this plan: add a `TODO(plan-2)` comment and cast to `Database["public"]["Tables"][T]["Row"]` to unblock. Log the file list in a `KNOWN_ISSUES.md` (plan 2 will clean up).
- If the error is in code touched by this plan: fix before committing.

- [ ] **Step 9.4: Commit any build-unblock patches**

```bash
cd Hyrank && git add -A
git commit -m "chore: unblock build after types.ts re-export"
```

---

## Task 10 — Playwright Smoke Test (No OAuth Required)

**Files:**
- Create: `Hyrank/playwright.config.ts` (if not already present from prior commit)
- Create: `Hyrank/tests/e2e/smoke.spec.ts`

- [ ] **Step 10.1: Write a minimal Playwright config**

Only if `Hyrank/playwright.config.ts` does not already exist:
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 10.2: Write a minimal smoke test**

Write `Hyrank/tests/e2e/smoke.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test.describe("hyrank smoke", () => {
  test("landing page renders", async ({ page }) => {
    await page.goto("/");
    // Expect some recognizable content (brand name).
    await expect(page.locator("body")).toContainText(/hyrank/i);
  });

  test("/login page loads without error", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(500);
  });

  test("/rankings page loads without error", async ({ page }) => {
    const response = await page.goto("/rankings");
    expect(response?.status()).toBeLessThan(500);
  });

  test("/robots.txt includes /admin/ disallow", async ({ page }) => {
    await page.goto("/robots.txt");
    await expect(page.locator("body")).toContainText("/admin/");
  });
});
```

- [ ] **Step 10.3: Run it**

Run: `cd Hyrank && npm run test:e2e -- tests/e2e/smoke.spec.ts`
Expected: 4/4 pass. If any fail, debug; this is the exit bar for Enhancement Plan 1.

- [ ] **Step 10.4: Commit**

```bash
cd Hyrank && git add playwright.config.ts tests/e2e/smoke.spec.ts
git commit -m "test(e2e): Playwright smoke — landing, login, rankings, robots disallow"
```

---

## Task 11 — Final Plan Completion Notes

- [ ] **Step 11.1: Confirm git log reads cleanly**

Run: `git log --oneline claude/hyrank-phase1-enhancement ^claude/hyrank-coming-soon-page-iuRbK`
Expected: ~10 focused commits from this plan.

- [ ] **Step 11.2: Add completion notes**

Append to this plan file at the bottom:
```markdown
## Notes

- Supabase project ref: uosmhbirchjudpwtptov
- Branch: claude/hyrank-phase1-enhancement
- Remaining advisor warnings (addressed in later plans):
  - 5× function_search_path_mutable → Plan 2 (add `SET search_path = ''` to functions)
  - materialized_view_in_api on server_signals → Plan 2 (revoke from anon+authenticated; service-role only)
  - rls_policy_always_true on bumps → Plan 4 (tighten bump insert policy when we rework bumps)
  - ~35× unindexed_foreign_keys (INFO) → noted; most are on low-traffic tables, defer
- Known type cleanups punted to Plan 2: any `TODO(plan-2)` comments added during Task 9
- Discord OAuth user action required before Plan 2: enable Discord provider in Supabase Auth → Providers, paste Client ID + Secret from Discord Dev Portal (redirect URL: https://uosmhbirchjudpwtptov.supabase.co/auth/v1/callback). AuthContext already calls signInWithOAuth('discord').

## Exit Bar (all must pass before starting Enhancement Plan 2)

- ✅ `npx tsc --noEmit` passes
- ✅ `npm run build` passes
- ✅ `npm run lint` passes (no new errors)
- ✅ `npm run test:e2e` smoke tests pass
- ✅ `/robots.txt` disallows `/admin/`
- ✅ Vote API module throws at load if `IP_SALT` unset
- ✅ All 3 cron routes 500 when `CRON_SECRET` unset (not silently authorize)
- ✅ `lib/supabase/types.ts` re-exports from generated `database.types.ts`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` recognized alongside `SUPABASE_SERVICE_KEY`
```

- [ ] **Step 11.3: Commit**

```bash
cd Hyrank && git add docs/superpowers/plans/
git commit -m "docs(plan): Enhancement Plan 1 completion notes"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `IP_SALT` insecure default → Task 1
- ✅ Cron auth bypass → Task 2
- ✅ `/admin` not in robots → Task 3
- ✅ Types drift → Task 4
- ✅ Sitemap uses browser client → Task 5
- ✅ `searchServers` PostgREST injection → Task 6
- ✅ Vote INSERT path works with new RLS → Task 7
- ✅ Env var naming hygiene → Task 8
- ✅ Build + smoke test verification → Tasks 9–10

**Placeholder scan:** None. Every task has concrete SQL/code/commands.

**Type consistency:** Tasks 4, 7, 8 all reference the same generated `Database` type from `lib/supabase/database.types.ts`.

**Scope check:** Plan is surgical. No rewrites. All larger refactors (Bayesian ranking, shadow invalidation, gamemode pages, vote plugin) deferred to later plans as noted in Non-Goals.
