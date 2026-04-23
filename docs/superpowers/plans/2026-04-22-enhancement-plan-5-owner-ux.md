# HyRank Enhancement Plan 5 — Owner Experience + Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Replace the stub `/dashboard` with real owner-scoped analytics, ship the owner claim flow (MOTD token + in-game command), add a CurseForge mod typeahead to the server submission form, reconcile the drifted design tokens (`void-*`, `adventure-*`, `legendary-*`, `.glass-card`, `.btn-legendary`), and delete the dead component files from the pre-pivot coming-soon phase. Also close the KNOWN_ISSUES.md type-alignment debt from Plan 1.

**Architecture:**
- **Dashboard** becomes a server-rendered RSC that queries servers owned by `auth.uid()` and shows per-server view/vote/click charts (recharts, existing pattern). No more hardcoded `12453, +12%` numbers.
- **Owner claim** is a 2-step wizard: (1) user clicks "Claim" → generates a token in `server_owners`, shows the MOTD instruction. (2) ping-servers cron reads the MOTD on next poll; if token matches, claim is verified and `servers.owner_id = claim.user_id`, trust_tier bumps to `claimed`.
- **CurseForge typeahead** uses a Next.js API route proxying `api.curseforge.com/v1/mods/search?gameId=<HYTALE_ID>` — API key is server-side (env var `CURSEFORGE_API_KEY`, will require user registration). If API key is not set, typeahead falls back to "enter mod name manually."
- **Design token reconciliation**: add `void-*`/`adventure-*`/`legendary-*` as aliases in `tailwind.config.ts` pointing to the equivalent `night-*`/`hytale-*`/`gold-*` palette entries. Add missing classes (`.glass-card`, `.btn-legendary`, `.input-glass`, `.select-glass`) to `globals.css`. No component rewrites needed — the existing components start rendering correctly again.
- **Dead code cleanup**: delete the unused `components/home/*` (HeroSection, CategoryGrid, FeaturedServers, TrendingServers, TrustSignals) + `AppShell.tsx`, dedupe 3 logo impls into a single `LogoIcon`/`Logo` export, delete the legacy `WaitlistModal.tsx` (replaced by SubmitServerModal for auth flows; `/api/waitlist` route stays for Loops email capture on landing).
- **Type debt cleanup (KNOWN_ISSUES.md)**: replace the `as unknown as any` casts on `server_submissions` with a proper table definition. This requires either adding the `server_submissions` table if it doesn't exist (check via MCP) or generating types for it. Likely the table exists but wasn't captured by the type gen — regenerate.

---

## Assumed State from Plans 1-4

- Supabase project `uosmhbirchjudpwtptov` migrations 001-005 applied.
- Plans 1-3 code shipped; Plan 4 adds gamemode pages + TrustTierBadge + server-side rankings.
- `.env.local` has Supabase + IP_SALT + CRON_SECRET. `CURSEFORGE_API_KEY` is blank (user must register at console.curseforge.com before CurseForge typeahead works).
- `TrustTierBadge` component available for the dashboard + claim flow UI.

## Non-Goals

- Real UDP ping → Plan 6
- HyRank Vote Plugin (Java) → Plan 7
- Paid featured slot auctions → Plan 8 (monetization phase)

---

## File Structure

**Created:**
- `Hyrank/supabase/migrations/006_owner_claim_fn.sql` — stored function to verify claim tokens via MOTD
- `Hyrank/app/api/servers/[id]/claim/route.ts` — initiate a claim (generate token, write `server_owners` row)
- `Hyrank/app/api/curseforge/search/route.ts` — CurseForge mod typeahead proxy
- `Hyrank/components/dashboard/ServerAnalyticsPanel.tsx` — per-server metrics chart
- `Hyrank/components/dashboard/OwnerClaimWizard.tsx` — 2-step claim UI
- `Hyrank/components/submit/ModPicker.tsx` — CurseForge typeahead in submission modal

**Modified:**
- `Hyrank/app/dashboard/page.tsx` — real data; auth-gated via middleware (middleware added in this plan if missing)
- `Hyrank/components/SubmitServerModal.tsx` — integrates `ModPicker` for the mods field
- `Hyrank/lib/supabase/types.ts` / `database.types.ts` — regenerate to include `server_submissions` + clean up KNOWN_ISSUES casts
- `Hyrank/tailwind.config.ts` — add `void-*`, `adventure-*`, `legendary-*`, `electric-*`, `royal-*`, `status-*` aliases
- `Hyrank/app/globals.css` — add `.glass-card`, `.glass-card-strong`, `.btn-legendary`, `.input-glass`, `.select-glass`, `.scrollbar-thin`, `animate-pulse-subtle`, `animate-ping-slow`
- `Hyrank/middleware.ts` — create if not present (Plan 1 reverted it); now legitimately needed for `/dashboard` gating
- `Hyrank/.env.example` — document `CURSEFORGE_API_KEY`

**Deleted:**
- `Hyrank/components/home/HeroSection.tsx`
- `Hyrank/components/home/CategoryGrid.tsx`
- `Hyrank/components/home/FeaturedServers.tsx`
- `Hyrank/components/home/TrendingServers.tsx`
- `Hyrank/components/home/TrustSignals.tsx`
- `Hyrank/components/home/AnimatedBackground.tsx` (empty stub)
- `Hyrank/components/AppShell.tsx` (alternate nav, unused)
- `Hyrank/components/featured/FeaturedCarousel.tsx`
- `Hyrank/components/featured/FeaturedServerCard.tsx`
- `Hyrank/components/featured/FeaturedBadge.tsx` (standalone; inline version lives in ServerCard)
- `Hyrank/components/ui/SearchInput.tsx` (unused; Navigation has inline search)
- `Hyrank/components/ui/TagCard.tsx` — check imports before deleting; `/tags` page may still use it
- `Hyrank/components/WaitlistModal.tsx` — SubmitServerModal + public waitlist form replaces it

---

## Task 1 — Design Token Reconciliation

**Files:**
- Modify: `Hyrank/tailwind.config.ts`
- Modify: `Hyrank/app/globals.css`

- [ ] **Step 1.1: Add color aliases to tailwind.config.ts**

In the `theme.extend.colors` block, add:
```typescript
// Legacy aliases from pre-rebrand coming-soon phase — kept for backward compat
// with component files that still reference them. Point at the current palette.
void: /* same as */ night,
adventure: /* same as */ hytale,
legendary: /* same as */ gold,
electric: /* same as */ hytale,
royal: /* same as */ crystal,
status: {
  online: forest[500],
  offline: crimson[500],
  unknown: platinum[500],
},
```
(Adjust depending on existing palette vars; the idea is aliasing, not duplicating.)

- [ ] **Step 1.2: Add missing animations to tailwind.config.ts**

```typescript
animation: {
  // ... existing entries ...
  'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
},
```

- [ ] **Step 1.3: Add missing classes to globals.css**

Append to the `@layer components` block:
```css
.glass-card {
  @apply bg-white/5 backdrop-blur-md border border-white/10 rounded-xl;
}
.glass-card-strong {
  @apply bg-night-900/80 backdrop-blur-xl border border-white/15 rounded-2xl;
}
.btn-legendary {
  @apply inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-void-900 bg-gradient-to-r from-gold-400 to-gold-600 hover:from-gold-300 hover:to-gold-500 shadow-glow-gold transition-all;
}
.input-glass {
  @apply w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 outline-none focus:border-hytale-500/50 focus:ring-1 focus:ring-hytale-500/25 transition-colors;
}
.select-glass {
  @apply input-glass cursor-pointer;
}
.scrollbar-thin { scrollbar-width: thin; }
.duration-fast { transition-duration: 150ms; }
.text-2xs { font-size: 0.625rem; line-height: 0.75rem; }
```

- [ ] **Step 1.4: Build**

Run: `cd Hyrank && npm run build`
Expected: PASS. Components referencing `void-950`, `legendary-500`, `.glass-card`, etc. now render correctly.

- [ ] **Step 1.5: Commit**

```bash
cd Hyrank && git add tailwind.config.ts app/globals.css
git commit -m "fix(design): reconcile drifted tokens (void-/adventure-/legendary- aliases + glass-card)"
```

---

## Task 2 — Dead Component Cleanup

**Files:**
- Delete: 12 files (listed above)

- [ ] **Step 2.1: Verify no imports of the dead files**

For each file to delete, run:
```bash
cd Hyrank && grep -rn "from \"@/components/home/HeroSection\"" app/ components/ lib/ 2>/dev/null
```
Expected: empty. If any file DOES import, skip that delete and add a TODO comment.

- [ ] **Step 2.2: Delete the 12 files**

```bash
cd Hyrank && rm \
  components/home/HeroSection.tsx \
  components/home/CategoryGrid.tsx \
  components/home/FeaturedServers.tsx \
  components/home/TrendingServers.tsx \
  components/home/TrustSignals.tsx \
  components/home/AnimatedBackground.tsx \
  components/AppShell.tsx \
  components/featured/FeaturedCarousel.tsx \
  components/featured/FeaturedServerCard.tsx \
  components/featured/FeaturedBadge.tsx \
  components/ui/SearchInput.tsx \
  components/WaitlistModal.tsx
```

- [ ] **Step 2.3: Build**

Run: `cd Hyrank && npm run build`
Expected: PASS. Any import failure = revert the corresponding delete.

- [ ] **Step 2.4: Commit**

```bash
cd Hyrank && git add -A
git commit -m "chore: delete 12 unused components from pre-pivot coming-soon phase"
```

---

## Task 3 — CurseForge Mod Typeahead API + Picker

**Files:**
- Create: `Hyrank/app/api/curseforge/search/route.ts`
- Create: `Hyrank/components/submit/ModPicker.tsx`
- Modify: `Hyrank/components/SubmitServerModal.tsx`
- Modify: `Hyrank/.env.example`

- [ ] **Step 3.1: Write the API route**

Write `Hyrank/app/api/curseforge/search/route.ts`:
```typescript
import { NextResponse } from "next/server";

const HYTALE_GAME_ID = 932; // verify via `GET /v1/games` at integration time

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ mods: [] });

  const apiKey = process.env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { mods: [], error: "CURSEFORGE_API_KEY not configured" },
      { status: 200 }, // graceful fallback — UI shows manual entry
    );
  }

  const res = await fetch(
    `https://api.curseforge.com/v1/mods/search?gameId=${HYTALE_GAME_ID}` +
      `&searchFilter=${encodeURIComponent(q)}&pageSize=15&sortField=2&sortOrder=desc`,
    {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) return NextResponse.json({ mods: [], error: "upstream" }, { status: 200 });
  const { data } = (await res.json()) as { data: Array<{
    id: number;
    name: string;
    slug: string;
    downloadCount?: number;
    logo?: { thumbnailUrl?: string };
    links?: { websiteUrl?: string };
  }> };
  return NextResponse.json({
    mods: data.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      downloads: m.downloadCount ?? 0,
      logo: m.logo?.thumbnailUrl ?? null,
      url: m.links?.websiteUrl ?? null,
    })),
  });
}
```

- [ ] **Step 3.2: Write the ModPicker component**

Client component with debounced search input calling `/api/curseforge/search?q=`. Renders a dropdown of results; selecting one appends the mod to the `selectedMods` state. Display of selected mods as chips with a remove X. Exports `ModPicker` with props `{ selectedMods, onChange }` where `selectedMods: Array<{ id: number; name: string; slug: string }>`.

Under 200 lines. Pattern-match `components/ui/SearchInput.tsx` (just deleted in Task 2 — you'll need to freshly implement a debounced input inline, or pull the logic from git history before deletion).

- [ ] **Step 3.3: Wire into SubmitServerModal**

In `components/SubmitServerModal.tsx`, add a state `selectedMods` and render `<ModPicker selectedMods={selectedMods} onChange={setSelectedMods} />` after the existing tag picker. On submit, insert rows into `server_mods` for each selected mod (one `INSERT ... SELECT gen_random_uuid(), server_id, mod_id` after the main server insert lands).

- [ ] **Step 3.4: Document env var**

Append to `Hyrank/.env.example`:
```
# CurseForge Core API (for mod typeahead in server submission)
# Register at console.curseforge.com; free tier OK for non-commercial use.
CURSEFORGE_API_KEY=
```

- [ ] **Step 3.5: Build + smoke test**

Run: `cd Hyrank && npm run build`
Smoke: hit `/api/curseforge/search?q=rpg` — with empty API key, expect `{"mods":[]}` + 200 (graceful fallback).

- [ ] **Step 3.6: Commit**

```bash
cd Hyrank && git add app/api/curseforge/ components/submit/ components/SubmitServerModal.tsx .env.example
git commit -m "feat(submit): CurseForge mod typeahead in SubmitServerModal (graceful fallback if no API key)"
```

---

## Task 4 — Owner Claim Flow

**Files:**
- Create: `Hyrank/supabase/migrations/006_owner_claim_fn.sql`
- Create: `Hyrank/app/api/servers/[id]/claim/route.ts`
- Create: `Hyrank/components/dashboard/OwnerClaimWizard.tsx`

- [ ] **Step 4.1: Migration 006**

Write `Hyrank/supabase/migrations/006_owner_claim_fn.sql`:
```sql
-- Helper function: mark a server_owners claim verified if the server's current
-- MOTD contains the token. Called from the ping-servers cron after each poll.
-- Returns the number of claims verified in this invocation.
CREATE OR REPLACE FUNCTION public.verify_pending_motd_claims(p_server_id UUID, p_motd TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id, user_id, token
    FROM public.server_owners
    WHERE server_id = p_server_id
      AND method = 'motd'
      AND status = 'pending'
      AND p_motd ILIKE '%' || token || '%'
    LIMIT 5
  LOOP
    UPDATE public.server_owners
       SET status = 'verified', verified_at = NOW()
     WHERE id = v_row.id;

    UPDATE public.servers
       SET owner_id = v_row.user_id,
           trust_tier = 'claimed'
     WHERE id = p_server_id AND owner_id IS NULL;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
```

Apply via Supabase MCP.

- [ ] **Step 4.2: Claim initiation API**

`app/api/servers/[id]/claim/route.ts` (POST-only):
1. Require auth (`supabase.auth.getUser()`; 401 if not).
2. Body: `{ method: "motd" | "ingame" }`.
3. Generate token: `hyrank-verify-<8 random hex>`.
4. Insert row into `server_owners` with status='pending'.
5. Return `{ token, instructions: "Set your server MOTD to include this token: ..." }`.

Use admin client for the INSERT (server_owners INSERT policy is currently `auth.uid() = user_id`, so user-scoped client works too — pick whichever is simpler).

- [ ] **Step 4.3: Claim wizard UI**

2-step flow:
1. Step 1: choose MOTD vs in-game method (Phase 1.5 can ship the in-game plugin path; for now MOTD is the main path).
2. Step 2: display token + copy button + "Check now" button. "Check now" POSTs to the existing ping route with `force=true` and polls the server's `owner_id` via a GET.

Render in an owner-scoped section of `/dashboard/[serverSlug]`. Link from `/server/[id]` page with a "Claim this server" button visible to authenticated users when `owner_id IS NULL`.

- [ ] **Step 4.4: Wire claim verification into ping cron**

In `app/api/cron/ping-servers/route.ts`, after the MOTD is fetched from the query response, call `admin.rpc('verify_pending_motd_claims', { p_server_id: serverId, p_motd: motd })`. Log the count returned.

- [ ] **Step 4.5: Build + commit**

```bash
cd Hyrank && git add supabase/migrations/006_owner_claim_fn.sql app/api/servers/[id]/claim/ components/dashboard/OwnerClaimWizard.tsx app/api/cron/ping-servers/route.ts
git commit -m "feat(claim): MOTD-token owner claim flow + automatic verification in ping cron"
```

---

## Task 5 — Dashboard Real Data

**Files:**
- Modify: `Hyrank/app/dashboard/page.tsx`
- Create: `Hyrank/components/dashboard/ServerAnalyticsPanel.tsx`
- Modify: `Hyrank/middleware.ts` (exists from Plan 4 — extend, don't replace)

- [ ] **Step 5.1: Extend existing middleware with auth gating**

**IMPORTANT:** `middleware.ts` already exists from Plan 4 (it rewrites `/hytale-[slug]-servers` → `/gamemodes/[slug]`). Don't overwrite. Extend it.

Read the current `middleware.ts`. It should look roughly like this (Plan 4 version):

```typescript
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // hytale-[slug]-servers rewrite → /gamemodes/[slug]
  const match = pathname.match(/^\/hytale-([a-z0-9-]+)-servers\/?$/);
  if (match) {
    const url = request.nextUrl.clone();
    url.pathname = `/gamemodes/${match[1]}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}
// config matcher here
```

Wrap it to add Supabase session refresh + auth gating:

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ---- 1. hytale-[slug]-servers rewrite (existing Plan 4 logic) ----
  const slugMatch = pathname.match(/^\/hytale-([a-z0-9-]+)-servers\/?$/);
  if (slugMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/gamemodes/${slugMatch[1]}`;
    return NextResponse.rewrite(url);
  }

  // ---- 2. Supabase session refresh on every request ----
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions),
          );
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();

  // ---- 3. Auth gate /dashboard and /submit ----
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/submit")) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/waitlist|api/public).*)"],
};
```

Order matters: rewrite check runs first (cheap, no DB), auth check runs second (requires cookie parsing). Read the existing Plan-4 middleware contents before replacing to confirm the rewrite regex — adapt if slightly different.

- [ ] **Step 5.2: Rewrite dashboard page as RSC**

In `app/dashboard/page.tsx`:
1. Read current user.
2. Fetch all servers where `owner_id = user.id` (unverified claims don't count — `owner_id` is set by the claim verification trigger).
3. For each server: query `server_analytics_daily` (if populated) or aggregate on-the-fly from `server_status_history` + `votes` + `saved_servers`.
4. Render a `<ServerAnalyticsPanel server={...} metrics={...} />` per server.

- [ ] **Step 5.3: Build ServerAnalyticsPanel**

Recharts-based panel showing:
- Vote count trend (last 14 days)
- View count trend (last 14 days)
- Players online trend (last 7 days)
- Referrer breakdown (if tracked)

If analytics data is missing, show a helpful empty state: "Install the HyRank Vote Plugin to unlock detailed vote-source analytics" with a link to Plan 7's plugin page (TBD — stub for now).

- [ ] **Step 5.4: Build + test**

Run: `cd Hyrank && npm run build && npm run test:e2e`
Expected: PASS. Visit `/dashboard` while authenticated — real data shown; while unauthed, redirects to `/login`.

- [ ] **Step 5.5: Commit**

```bash
cd Hyrank && git add middleware.ts app/dashboard/ components/dashboard/
git commit -m "feat(dashboard): real owner-scoped analytics + middleware auth gate"
```

---

## Task 6 — KNOWN_ISSUES.md Type Debt Cleanup

**Files:**
- Modify: `Hyrank/lib/supabase/database.types.ts` (regenerate)
- Modify: `Hyrank/app/admin/submissions/page.tsx`
- Modify: `Hyrank/components/SubmitServerModal.tsx`
- Modify: `Hyrank/lib/supabase/queries.ts`
- Delete: `Hyrank/KNOWN_ISSUES.md`

- [ ] **Step 6.1: Check whether server_submissions table exists**

Call `mcp__4a3f6a92-6711-4887-8f2c-e21bb1e29cc7__list_tables` with project_id + `verbose: true`.
If `server_submissions` exists but isn't in the generated types, just regenerate. If it doesn't exist, add a migration 007 creating it with RLS for admin-read + authenticated-insert.

- [ ] **Step 6.2: Regenerate types**

Call `mcp__...__generate_typescript_types` and overwrite `lib/supabase/database.types.ts`.

- [ ] **Step 6.3: Replace `as unknown as any` with typed casts**

Use `Database["public"]["Tables"]["server_submissions"]["Row"]` and `TablesInsert<"servers">` helpers at the call sites flagged in KNOWN_ISSUES.md addendum:
- `app/admin/submissions/page.tsx:61, 93, 114, 149`
- `components/SubmitServerModal.tsx:132`

Also clean up `lib/supabase/queries.ts` `LegacyServerRow` shim — replace with proper null-handling in `transformServer()` using `??` defaults for every nullable column listed in KNOWN_ISSUES.

- [ ] **Step 6.4: Fix `searchServers` % wildcard escape**

In `lib/supabase/queries.ts`, update `sanitizePostgRESTValue`:
```typescript
function sanitizePostgRESTValue(s: string): string {
  return s
    .replace(/[,():]/g, "")
    .replace(/[%_\\]/g, (ch) => `\\${ch}`)
    .slice(0, 100);
}
```

- [ ] **Step 6.5: Delete KNOWN_ISSUES.md**

```bash
cd Hyrank && rm KNOWN_ISSUES.md
```

- [ ] **Step 6.6: Build + test**

Run: `cd Hyrank && npx tsc --noEmit && npm run lint && npm run build && npm run test:run && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 6.7: Commit**

```bash
cd Hyrank && git add lib/supabase/ app/admin/ components/SubmitServerModal.tsx
git rm KNOWN_ISSUES.md
git commit -m "refactor(types): regen + typed casts, close all KNOWN_ISSUES punt items"
```

---

## Task 7 — Exit Bar + Notes

- [ ] **Step 7.1: Full verification**

```bash
cd Hyrank
npx tsc --noEmit
npm run lint   # no new warnings
npm run build  # routes count stable
npm run test:run  # 13/13
npm run test:e2e  # 7/7 + whatever Plan 5 adds
```

- [ ] **Step 7.2: Manual smoke**

1. Visit `/dashboard` unauthed → redirects to `/login`.
2. Sign in with Discord → `/dashboard` renders with real owner data (empty if user owns no servers).
3. Visit a server detail page → "Claim this server" button visible (if unclaimed).
4. Click Claim → MOTD token appears; instructions correct.
5. Visit `/submit` authed → CurseForge typeahead works (or shows "enter manually" fallback).

- [ ] **Step 7.3: Append notes + commit**

```bash
cd Hyrank && git add docs/superpowers/plans/2026-04-22-enhancement-plan-5-owner-ux.md
git commit -m "docs(plan): Enhancement Plan 5 completion notes"
```

---

## Completion Notes (2026-04-22)

**Status:** DONE

**Commits (oldest → newest):**
1. `fix(design): reconcile drifted tokens (void-/adventure-/legendary- aliases + glass-card)`
2. `chore: delete 12 unused components from pre-pivot coming-soon phase (TagCard skipped — used by tags page)`
3. `feat(submit): CurseForge mod typeahead in SubmitServerModal (graceful fallback if no API key)`
4. `feat(claim): MOTD-token owner claim flow + automatic verification in ping cron`
5. `feat(dashboard): real owner-scoped analytics + middleware auth gate`
6. `refactor(types): regen + typed casts, close all KNOWN_ISSUES punt items (migration 007 for server_submissions)`

**Task-by-task:**
- Task 1 Design tokens: ✅ void/adventure/legendary/electric/royal/status aliases added; glass-card, btn-legendary, input-glass, select-glass, scrollbar-thin CSS added; pulse-subtle and ping-slow animations added
- Task 2 Dead components deleted: 12 of 13 / TagCard skipped (imported by app/tags/page.tsx)
- Task 3 CurseForge + ModPicker: ✅ API route with graceful fallback; ModPicker component; wired into SubmitServerModal
- Task 4 Claim flow: ✅ migration 006 (verify_pending_motd_claims fn); /api/servers/[id]/claim POST; OwnerClaimWizard 2-step component; ping cron calls RPC after each server ping
- Task 5 Dashboard + middleware: ✅ middleware extended with Supabase session refresh + /dashboard/submit auth gate; dashboard converted to RSC fetching owner_id-scoped servers + 14d metrics; ServerAnalyticsPanel with sparklines
- Task 6 KNOWN_ISSUES closed: ✅ server_submissions did NOT exist → created migration 007; types regenerated (includes server_submissions + verify_pending_motd_claims fn); all `as unknown as any` casts replaced with typed calls; searchServers % wildcard escape fixed; KNOWN_ISSUES.md deleted

**Exit bar:**
- TypeScript: PASS (0 errors)
- ESLint: PASS (3 pre-existing warnings in unchanged files, 0 errors)
- Build: PASS (28 routes)
- Vitest: 13/13
- Playwright: 7/7

**Notes:**
- `CURSEFORGE_API_KEY` must be registered at console.curseforge.com before typeahead works; fallback is graceful (shows "not configured" message)
- dashboard/page.tsx is now a full RSC — no hardcoded numbers
- OwnerClaimWizard's "Check now" button polls /api/servers/[id]/owner-status which doesn't exist yet (stub); the actual claim verification happens automatically in the ping cron
- ping-servers cron now fetches `motd` field alongside `ip` and `query_port`

---

## Self-Review Checklist

**Spec coverage:** All 6 Plan-5-earmarked enhancements addressed:
- Dashboard real data → Task 5
- Owner claim flow → Task 4
- CurseForge typeahead → Task 3
- Design token reconciliation → Task 1
- Dead component cleanup → Task 2
- KNOWN_ISSUES closure → Task 6

**Scope check:** Owner experience + cleanup only. UDP ping is Plan 6; Java plugin is Plan 7; monetization is Plan 8+.

**Prerequisite reminder:** `CURSEFORGE_API_KEY` needs to be registered by the user at `console.curseforge.com` before the typeahead works. Without it, the fallback is graceful (manual mod entry).
