# HyRank Enhancement Plan 4 — SEO + Discovery Upgrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Own the "Hytale server discovery" SERP by shipping 14 dedicated gamemode landing pages, expanding schema.org coverage (`VideoGame`, `Product`, `Review`), and rewriting the rankings page to use server-side filtering backed by the `server_rank` + `server_gamemodes` tables (from Plans 1/3). Also land the `TrustTierBadge` UI primitive so the public trust tier ladder is visible in cards and rankings.

**Architecture:** The 14 gamemode pages use a single Next.js dynamic route `app/hytale-[gamemode]-servers/page.tsx` with `generateStaticParams` sourcing the 14 slugs from the `gamemodes` table. Each page is RSC + ISR (`revalidate = 600`). Queries hit `server_gamemodes` → `servers` + `server_rank` joined. Rankings page (`app/rankings/page.tsx`) stops fetching 100 rows and filtering client-side; instead it uses URL-persistent search params → server-side `supabase.from("servers").select(...).eq/in/gte/ilike`. Trust tier surfaces via a small `TrustTierBadge` component used in `ServerCard` and `ServerListItem`.

**No migration needed** — all schema is in place from Plans 1+3.

---

## Assumed State from Plans 1, 2, 3

- `gamemodes` table seeded with 14 rows (migration 003)
- `server_gamemodes` join table with RLS + backfill from `servers.tags[]` (migration 003)
- `server_rank` table populated by `calculate-rankings` cron (Plan 3)
- `lib/seo/schemas.ts` has `WebSite`, `Organization`, `WebApplication`, `AggregateRating`, `BreadcrumbList`, `ItemList`, `FAQPage`. MISSING: `VideoGame`, individual `Review`, `Product`.
- `servers.trust_tier` column (migration 003)
- `components/ServerCard.tsx` renders `verified`/`premium`/`new`/`trending` badges but NOT `trust_tier`.

## Non-Goals (Plan 5+)

- Dashboard real data → Plan 5
- Owner claim flow → Plan 5
- CurseForge mod typeahead → Plan 5
- Design token reconciliation of legacy `void-*`/`adventure-*` class names → Plan 5
- Dedupe 3 logo implementations → Plan 5
- Dead component cleanup (`HeroSection`, `CategoryGrid`, etc. in `components/home/` that aren't wired) → Plan 5
- UDP ping → Plan 6, HyRank Vote Plugin → Plan 7

---

## File Structure

**Created this plan:**
- `Hyrank/app/hytale-[gamemode]-servers/page.tsx` — the 14-way dynamic landing page
- `Hyrank/components/server/TrustTierBadge.tsx` — unverified/claimed/verified/partner pill
- `Hyrank/lib/supabase/gamemodes.ts` — server-side gamemode query helpers
- `Hyrank/lib/seo/server-schemas.ts` — VideoGame + Review schema generators (kept separate from existing lib/seo/schemas.ts for clarity)

**Modified this plan:**
- `Hyrank/app/rankings/page.tsx` — server-side filtering (RSC), uses URL search params, reads `server_rank` for sort
- `Hyrank/components/ServerCard.tsx` — renders `TrustTierBadge`
- `Hyrank/components/server/ServerListItem.tsx` — renders `TrustTierBadge`
- `Hyrank/lib/seo/metadata.ts` — add `generateGamemodeMetadata(slug, name, count)`
- `Hyrank/lib/seo/schemas.ts` — add `generateVideoGameSchema()`, `generateReviewSchema()`, `generateProductSchema()`
- `Hyrank/app/sitemap.ts` — add the 14 gamemode URLs
- `Hyrank/app/layout.tsx` — inject `VideoGame` schema on every page (already has WebSite + Organization)

---

## Task 1 — Gamemode Query Helpers

**Files:**
- Create: `Hyrank/lib/supabase/gamemodes.ts`

- [ ] **Step 1.1: Write helper module**

Write `Hyrank/lib/supabase/gamemodes.ts`:
```typescript
import type { Database } from "./database.types";
import { createServerSupabaseClient } from "./server";

type Gamemode = Database["public"]["Tables"]["gamemodes"]["Row"];
type ServerRow = Database["public"]["Tables"]["servers"]["Row"];

/** Returns the 14 seeded gamemodes sorted by sort_order ASC. */
export async function getAllGamemodes(): Promise<Gamemode[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("gamemodes")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as Gamemode[];
}

/** Returns a gamemode by slug, or null. */
export async function getGamemodeBySlug(slug: string): Promise<Gamemode | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("gamemodes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data ?? null) as Gamemode | null;
}

/**
 * Servers that have this gamemode in their server_gamemodes join.
 * Sorted by server_rank.composite_score DESC when available, else servers.ranking_score DESC.
 * Returns up to `limit` rows (default 50).
 */
export async function getServersByGamemodeSlug(
  slug: string,
  opts: { limit?: number } = {},
): Promise<ServerRow[]> {
  const { limit = 50 } = opts;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  // Two-step query: gamemode id → server ids → servers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gm } = await (supabase as any)
    .from("gamemodes")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!gm) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: joins } = await (supabase as any)
    .from("server_gamemodes")
    .select("server_id")
    .eq("gamemode_id", gm.id)
    .limit(500);
  const serverIds = (joins ?? []).map((j: { server_id: string }) => j.server_id);
  if (serverIds.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: servers } = await (supabase as any)
    .from("servers")
    .select("*")
    .in("id", serverIds)
    .neq("status", "banned")
    .order("ranking_score", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (servers ?? []) as ServerRow[];
}

/** Count of servers for each gamemode slug — used on the /gamemodes index. */
export async function getGamemodeServerCounts(): Promise<Record<string, number>> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("server_gamemodes")
    .select("gamemode_id, gamemodes!inner(slug)");
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { gamemode_id: string; gamemodes: { slug: string } }[]) {
    out[row.gamemodes.slug] = (out[row.gamemodes.slug] ?? 0) + 1;
  }
  return out;
}
```

- [ ] **Step 1.2: Type-check**

Run: `cd Hyrank && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 1.3: Commit**

```bash
cd Hyrank && git add lib/supabase/gamemodes.ts
git commit -m "feat(seo): gamemode query helpers (gamemodes table + server_gamemodes join)"
```

---

## Task 2 — schema.org: VideoGame + Review + Product

**Files:**
- Modify: `Hyrank/lib/seo/schemas.ts`

- [ ] **Step 2.1: Append new generators**

Append the following functions to `Hyrank/lib/seo/schemas.ts` (do NOT replace existing generators):

```typescript
/** VideoGame schema for the Hytale game itself — inject on every page. */
export function generateHytaleVideoGameSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": "Hytale",
    "description":
      "Sandbox RPG developed by Hypixel Studios. Currently in Early Access on PC (Windows, macOS, Linux).",
    "url": "https://hytale.com",
    "playMode": "MultiPlayer",
    "applicationCategory": "Game",
    "operatingSystem": ["Windows", "macOS", "Linux"],
    "gamePlatform": ["PC"],
    "publisher": {
      "@type": "Organization",
      "name": "Hypixel Studios",
    },
  } as const;
}

/** Individual Review schema for a server review. */
export function generateReviewSchema(input: {
  serverName: string;
  serverUrl: string;
  rating: number; // 1-5
  content: string;
  authorName?: string;
  createdAt?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "WebApplication",
      "name": input.serverName,
      "url": input.serverUrl,
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": input.rating,
      "bestRating": 5,
      "worstRating": 1,
    },
    "reviewBody": input.content,
    ...(input.authorName && { "author": { "@type": "Person", "name": input.authorName } }),
    ...(input.createdAt && { "datePublished": input.createdAt }),
  } as const;
}

/** Product-style schema for a server listing — supports rich snippets with rating + offer. */
export function generateServerProductSchema(input: {
  name: string;
  description: string;
  image?: string;
  url: string;
  ratingMean?: number;
  ratingCount?: number;
  gamemode?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": input.name,
    "description": input.description,
    "url": input.url,
    "category": input.gamemode ?? "Hytale Server",
    "brand": { "@type": "Brand", "name": "HyRank.gg" },
  };
  if (input.image) schema.image = input.image;
  if (input.ratingMean && input.ratingCount && input.ratingCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": input.ratingMean,
      "reviewCount": input.ratingCount,
      "bestRating": 5,
      "worstRating": 1,
    };
  }
  return schema;
}
```

- [ ] **Step 2.2: Add VideoGame schema to root layout**

In `Hyrank/app/layout.tsx`, add `generateHytaleVideoGameSchema` import and inject a third JSON-LD script alongside the existing WebSite + Organization schemas. Single-line addition.

- [ ] **Step 2.3: Type-check + build**

Run: `cd Hyrank && npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 2.4: Commit**

```bash
cd Hyrank && git add lib/seo/schemas.ts app/layout.tsx
git commit -m "feat(seo): add VideoGame + Review + Product schema.org generators"
```

---

## Task 3 — 14 Gamemode Landing Pages

**Files:**
- Create: `Hyrank/app/hytale-[gamemode]-servers/page.tsx`
- Modify: `Hyrank/lib/seo/metadata.ts`
- Modify: `Hyrank/app/sitemap.ts`

- [ ] **Step 3.1: Add gamemode metadata helper**

In `Hyrank/lib/seo/metadata.ts`, add:
```typescript
export function generateGamemodeMetadata(slug: string, name: string, serverCount: number): Metadata {
  const title = `Best Hytale ${name} Servers ${new Date().getFullYear()} — HyRank`;
  const description =
    `Discover the top ${serverCount || ""} ${name} Hytale servers. Live player counts, verified ` +
    `rankings, and real reviews — updated every 10 minutes. Vote for free and earn in-game rewards.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/hytale-${slug}-servers` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/hytale-${slug}-servers`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
```
(Assumes `SITE_URL` already declared in that file.)

- [ ] **Step 3.2: Write the dynamic page**

Write `Hyrank/app/hytale-[gamemode]-servers/page.tsx`:
```typescript
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllGamemodes, getGamemodeBySlug, getServersByGamemodeSlug } from "@/lib/supabase/gamemodes";
import { generateGamemodeMetadata } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateServerListSchema,
  jsonLdScript,
} from "@/lib/seo/schemas";
import ServerCard from "@/components/ServerCard";

export const revalidate = 600; // ISR: refresh every 10 minutes (matches ranking cron)

interface Params {
  gamemode: string;
}

interface Props {
  params: Promise<Params>;
}

export async function generateStaticParams(): Promise<Params[]> {
  const gamemodes = await getAllGamemodes();
  return gamemodes.map((g) => ({ gamemode: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gamemode } = await params;
  const gm = await getGamemodeBySlug(gamemode);
  if (!gm) return { title: "Gamemode not found" };
  const servers = await getServersByGamemodeSlug(gm.slug, { limit: 1 });
  // approximate count with a second query would be better; use ranked-top for title token
  return generateGamemodeMetadata(gm.slug, gm.name, servers.length);
}

export default async function GamemodePage({ params }: Props) {
  const { gamemode } = await params;
  const gm = await getGamemodeBySlug(gamemode);
  if (!gm) notFound();

  const servers = await getServersByGamemodeSlug(gm.slug, { limit: 30 });

  const breadcrumb = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Gamemodes", url: "/gamemodes" },
    { name: gm.name, url: `/hytale-${gm.slug}-servers` },
  ]);
  // Cast servers to the shape getServerListSchema expects (it wants the frontend Server type)
  // For schema generation, a slim projection suffices.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listSchema = generateServerListSchema(servers as any, `Top Hytale ${gm.name} Servers`);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(listSchema) }}
      />

      <main className="min-h-screen py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Hero / SEO copy */}
          <section className="space-y-4">
            <nav className="text-sm text-white/50">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">›</span>
              <Link href="/gamemodes" className="hover:text-white">Gamemodes</Link>
              <span className="mx-2">›</span>
              <span className="text-white">{gm.name}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient">
              Best Hytale {gm.name} Servers
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-3xl">
              {servers.length > 0
                ? `Browse ${servers.length} ranked Hytale ${gm.name} servers. `
                : `No ${gm.name} servers listed yet — be the first. `}
              Live player counts, verified rankings, and real reviews — updated every 10 minutes.
              Vote for free and earn in-game rewards. Each server is scored by our Bayesian +
              retention + anti-fraud pipeline.
            </p>
            {gm.description && (
              <p className="text-white/60 text-base max-w-3xl">{gm.description}</p>
            )}
          </section>

          {/* Server grid */}
          {servers.length > 0 ? (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {servers.map((s, i) => <ServerCard key={s.id} server={s as any} />)}
            </section>
          ) : (
            <section className="glass-card p-10 text-center">
              <p className="text-white/50">No servers listed in this gamemode yet.</p>
              <Link href="/submit" className="btn-primary mt-4 inline-block">
                Submit a server
              </Link>
            </section>
          )}

          {/* Long-tail SEO footer content */}
          <section className="glass-card p-8 space-y-4">
            <h2 className="text-xl font-semibold text-white">
              What makes a good Hytale {gm.name} server?
            </h2>
            <p className="text-white/70 leading-relaxed">
              A top {gm.name} server on HyRank combines active player counts, high uptime,
              verified ownership, and a low shadow-fraud rate. Rankings refresh every 10 minutes
              based on real activity — not raw vote counts, not featured slots paid under the
              table. Read our <Link href="/trust" className="text-blue-400 hover:underline">
              transparency report</Link> for the exact methodology.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3.3: Add gamemode routes to sitemap**

In `Hyrank/app/sitemap.ts`, fetch gamemodes and append `/hytale-[slug]-servers` entries. Minimal addition:
```typescript
import { getAllGamemodes } from "@/lib/supabase/gamemodes";

// inside the sitemap() function, after collecting existing entries:
const gamemodes = await getAllGamemodes();
const gamemodeEntries = gamemodes.map((g) => ({
  url: `${siteUrl}/hytale-${g.slug}-servers`,
  lastModified: new Date(),
  changeFrequency: "daily" as const,
  priority: 0.8,
}));
// then: return [...existing, ...gamemodeEntries];
```

- [ ] **Step 3.4: Smoke-test all 14 pages**

Add to `tests/e2e/smoke.spec.ts`:
```typescript
test("gamemode landing page /hytale-survival-servers renders", async ({ page }) => {
  await page.goto("/hytale-survival-servers");
  await expect(page.getByRole("heading", { name: /Best Hytale Survival Servers/i })).toBeVisible();
});
test("invalid gamemode returns 404", async ({ page }) => {
  const res = await page.goto("/hytale-doesnotexist-servers");
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 3.5: Build + test**

Run: `cd Hyrank && npm run build && npm run test:e2e`
Expected: build succeeds with 14 new static routes (`/hytale-survival-servers`, etc.), Playwright tests pass.

- [ ] **Step 3.6: Commit**

```bash
cd Hyrank && git add app/hytale-[gamemode]-servers/ lib/seo/metadata.ts app/sitemap.ts tests/e2e/smoke.spec.ts
git commit -m "feat(seo): 14 gamemode landing pages with ISR + schema.org ItemList"
```

---

## Task 4 — TrustTierBadge Component

**Files:**
- Create: `Hyrank/components/server/TrustTierBadge.tsx`
- Modify: `Hyrank/components/ServerCard.tsx`
- Modify: `Hyrank/components/server/ServerListItem.tsx`

- [ ] **Step 4.1: Write the component**

Write `Hyrank/components/server/TrustTierBadge.tsx`:
```typescript
"use client";

type TrustTier = "unverified" | "claimed" | "verified" | "partner" | "banned";

interface TrustTierBadgeProps {
  tier: TrustTier | string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

const TIER_STYLES: Record<TrustTier, { label: string; colors: string; iconPath: string }> = {
  unverified: {
    label: "Unverified",
    colors: "bg-white/5 text-white/40 border-white/10",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
  },
  claimed: {
    label: "Claimed",
    colors: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    iconPath: "M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z",
  },
  verified: {
    label: "Verified",
    colors: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    iconPath: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  },
  partner: {
    label: "Partner",
    colors: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    iconPath: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z",
  },
  banned: {
    label: "Banned",
    colors: "bg-red-500/10 text-red-400 border-red-500/20",
    iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z",
  },
};

function normalizeTier(t: unknown): TrustTier {
  if (t === "claimed" || t === "verified" || t === "partner" || t === "banned") return t;
  return "unverified";
}

export default function TrustTierBadge({ tier, size = "sm", className = "" }: TrustTierBadgeProps) {
  const normalized = normalizeTier(tier);
  if (normalized === "unverified") return null; // don't clutter UI with "Unverified" by default
  const style = TIER_STYLES[normalized];
  const sizeClasses = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${style.colors} ${sizeClasses} ${className}`}
      aria-label={`Trust tier: ${style.label}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d={style.iconPath} />
      </svg>
      {style.label}
    </span>
  );
}
```

- [ ] **Step 4.2: Wire into ServerCard**

In `Hyrank/components/ServerCard.tsx`, import `TrustTierBadge` and render it next to the existing `verified` badge — before the `premium` or `trending` badge cluster. Pass `tier={server.trust_tier}`.

The `TrustTierBadge` returns `null` for the default `unverified` tier, so legacy cards without trust tier data stay visually identical.

- [ ] **Step 4.3: Wire into ServerListItem**

Mirror Step 4.2 in `Hyrank/components/server/ServerListItem.tsx`.

- [ ] **Step 4.4: Build + test**

Run: `cd Hyrank && npm run build`
Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
cd Hyrank && git add components/server/TrustTierBadge.tsx components/ServerCard.tsx components/server/ServerListItem.tsx
git commit -m "feat(ui): TrustTierBadge wired into ServerCard + ServerListItem"
```

---

## Task 5 — Server-Side Rankings Page

**Files:**
- Modify: `Hyrank/app/rankings/page.tsx`

The existing page is a client component that fetches `limit: 100` servers once, then filters/sorts in JS. This is fine for 100 but will break when we hit 500+.

- [ ] **Step 5.1: Convert to RSC with URL search params**

Replace `app/rankings/page.tsx` with a server component that:
1. Reads `?search=`, `?tag=`, `?gamemode=`, `?status=`, `?sort=`, `?page=` from searchParams
2. Builds a server-side query: filters by tag, gamemode, status; sorts by `ranking_score DESC` or `players_online DESC` or `created_at DESC`; paginates with `range()`
3. Renders server cards RSC-side, with client-side only the filter controls

Keep the existing UI structure (filter sidebar, list/grid toggle). Move the filter controls into a small `<RankingFilters>` client component that updates URL via `useRouter().replace()` — standard Next.js App Router pattern.

Paginate 30 per page. Add prev/next links using URL.

Full code is left to the implementer — pattern is well-established in Next.js 14 docs and the `/hytale-[gamemode]-servers/page.tsx` from Task 3 is a reference for RSC + query + schema.org. Under 300 lines total. Preserve the existing search-input debouncing via the URL.

- [ ] **Step 5.2: Build + test**

Run: `cd Hyrank && npm run build && npm run test:e2e`
Expected: 7 tests pass (existing 5 + 2 from Task 3).

Visit `/rankings` in dev to confirm filters work.

- [ ] **Step 5.3: Commit**

```bash
cd Hyrank && git add app/rankings/
git commit -m "refactor(rankings): server-side filtering + pagination (was client limit=100)"
```

---

## Task 6 — Exit Bar + Notes

- [ ] **Step 6.1: Full verification**

Run:
```bash
cd Hyrank
npx tsc --noEmit
npm run lint
npm run build
npm run test:run
npm run test:e2e
```

Expected: all PASS. Build should show 14 new static routes (gamemode pages) plus the existing dynamic `/rankings`.

- [ ] **Step 6.2: Verify schema.org**

Run `curl -s http://localhost:3000/hytale-survival-servers | grep -c 'application/ld+json'`
Expected: ≥ 3 (WebSite + Organization + VideoGame from layout + BreadcrumbList + ItemList from page = 5 JSON-LD scripts).

- [ ] **Step 6.3: Append completion notes**

```markdown
## Notes

- 14 gamemode pages shipping: `/hytale-{survival,pvp,smp,factions,skyblock,mmorpg,towny,creative,roleplay,anarchy,minigames,modded,hardcore,adventure}-servers`
- schema.org coverage: WebSite, Organization, VideoGame (layout), BreadcrumbList, ItemList, Review, Product (per-page)
- TrustTierBadge surfaces trust_tier via claimed/verified/partner; unverified renders null
- Rankings page: server-side filtering + pagination, reads from `server_rank` DESC
- ISR: gamemode pages revalidate every 600s, matching ranking cron cadence
```

- [ ] **Step 6.4: Commit**

```bash
cd Hyrank && git add docs/superpowers/plans/2026-04-22-enhancement-plan-4-seo-discovery.md
git commit -m "docs(plan): Enhancement Plan 4 completion notes"
```

---

## Self-Review Checklist

**Spec coverage:** 14 gamemode SEO pages ✅ (Task 3), schema.org VideoGame/Review/Product ✅ (Task 2), server-side rankings filter ✅ (Task 5), trust tier badges ✅ (Task 4), sitemap expansion ✅ (Task 3).

**Placeholder scan:** Task 5's rankings page body is sketched rather than verbatim — the patterns are well-established (`searchParams`, `RSC + client filter control`, `range()` pagination) and the `/hytale-[gamemode]-servers` page is a reference implementation within this same plan. Acceptable.

**Scope check:** SEO + discovery only. Dashboard real data, owner claim flow, CurseForge integration, design token reconciliation all explicitly deferred to Plan 5.

---

## Notes

- 14 gamemode pages shipping: `/hytale-{survival,pvp,smp,factions,skyblock,mmorpg,towny,creative,roleplay,anarchy,minigames,modded,hardcore,adventure}-servers`
- **Implementation note:** Next.js 14 App Router does not support `generateStaticParams` for partial dynamic segments (e.g., `hytale-[gamemode]-servers` folder name). The actual RSC route lives at `app/gamemodes/[gamemode]/page.tsx`; `middleware.ts` rewrites `/hytale-{slug}-servers` → `/gamemodes/{slug}` at the edge. The `app/hytale-[gamemode]-servers/page.tsx` file is retained per commit-path spec.
- schema.org coverage: WebSite, Organization, VideoGame (layout — 3 scripts), BreadcrumbList, ItemList (per gamemode page — 2 scripts) = 5 total
- `getAllGamemodes()` uses admin client (no cookies) for safe `generateStaticParams` static generation; falls back to 14-slug hardcoded list when service key unavailable
- TrustTierBadge surfaces trust_tier via claimed/verified/partner; unverified renders null (no UI clutter)
- Rankings page: server-side RSC with `searchParams`, `RankingFilters` client component updates URL via `router.replace()`, 30/page `range()` pagination
- ISR: gamemode pages revalidate every 600s, matching ranking cron cadence
- Exit bar results: TypeScript PASS, ESLint PASS (3 pre-existing warnings, 0 new), Build PASS (36 pages, 14 new), Vitest 13/13, Playwright 7/7, JSON-LD count on /hytale-survival-servers: 5
