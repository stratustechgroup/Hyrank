# HyRank.gg — Phase 1 MVP Design

**Date:** 2026-04-22
**Author:** James Farmer (with Claude Code assistance)
**Status:** Draft — pending user review
**Approach:** C — "Hytale-Native Discovery Platform" (Modrinth/Letterboxd-class UX for Hytale servers)

---

## 1. Executive Summary

HyRank.gg is the Hytale server discovery, ranking, and listing platform — built to be the definitive home for finding, tracking, and running Hytale servers. We enter a crowded market (10+ competitor sites within 3 months of Hytale's Early Access launch) by shipping a product that is 10x better across seven concrete wedges the incumbents have left open:

1. **Provable anti-fraud voting** (Discord OAuth + fingerprint + proof-of-play roadmap) — kills the $1.69/100-vote bot market
2. **Native owner analytics** — free baseline that competitors sell separately or don't ship at all
3. **Mobile-first, captcha-free voting** — competitors' mobile UX is embarrassingly broken
4. **Transparent performance-based featured slots** (Phase 2) — refund thresholds; no hidden pricing
5. **Retention-weighted Bayesian ranking + dead-listing decay** — the only non-gameable ranking model
6. **Deep Hytale-native integration** — live UDP query, JVM plugin detection, CurseForge sync
7. **Community trust layer** — public moderation log, trust tier ladder (Unverified → Claimed → Verified → Partner), positioned to earn "Official Hytale Server List" status

Phase 1 scope is the minimum viable discovery platform: server ingestion, live pinging, Discord OAuth voting with anti-fraud v1, Bayesian ranking, faceted search, user accounts with wishlist, owner claim flow, basic owner dashboard, SEO foundations. Monetization, community feeds, reviews, and ecosystem integrations (Discord bot, public API) ship in Phases 2–4.

## 2. Goals & Non-Goals

### Goals (Phase 1)

- Ship a credible, launchable discovery platform within the Phase 1 timebox (rough estimate: 8–12 weeks from kickoff to public launch, with the Next.js app and the HyRank Vote Plugin built in parallel)
- Own the week-1 SEO land grab: schema.org JSON-LD, 14 gamemode landing pages, vote-widget backlink flywheel
- Establish the trust posture that earns the "Official Hytale Server List" slot over time
- Build the data pipeline and anti-fraud primitives that Phase 2 monetization + proof-of-play will build on
- Preserve the existing waitlist and convert its audience into Day-1 users

### Non-Goals (Phase 1)

- Stripe payments, featured slot purchases, premium owner accounts (Phase 2)
- Cryptographic proof-of-play verification (Phase 2 — Phase 1 uses OAuth + fingerprint + IP heuristics)
- Per-server Reddit-style community feeds, reviews, user-created public lists (Phase 3)
- Discord bot, public REST API, white-label widgets (Phase 4)
- Auto-detection of installed mods via plugin scan (Phase 2 — Phase 1 is owner-declared only)
- Editorial/newsroom content management (future)
- Mobile apps, native clients (future)

## 3. User Personas

1. **Alex, the Hytale Player (discovery-seeker).** Has logged ~20 hours in Hytale EA, wants a new SMP/Factions server. Browses mobile during commute. Expects to vote for servers for in-game rewards, bookmark them, see live player counts.
2. **Sam, the Server Owner (hobbyist).** Runs a mid-size Survival server (~50 concurrent players). Currently listed on 4 Minecraft-style sites; frustrated by vote botting by competitors and opaque featured pricing. Wants analytics and a clean dashboard.
3. **Jamie, the Server Owner (pro/community).** Runs a multi-gamemode network with 500+ concurrent players. Budget for paid promotion. Will evaluate HyRank on trust, fraud protection, and ROI transparency (Phase 2 conversion target).
4. **Taylor, the Mod/Content Creator.** Has a growing Hytale YouTube channel. Interested in embed widgets, curated lists, partner opportunities.

Phase 1 optimizes for **Alex** (discovery-seeker) and **Sam** (hobbyist owner). Jamie and Taylor convert in Phases 2–3.

## 4. Information Architecture

### Public routes

| Route | Purpose |
|---|---|
| `/` | Landing — hero, top servers rail, rising servers rail, 14 gamemode tiles, waitlist CTA for unauth users becoming "Join HyRank" post-launch |
| `/servers` | Primary list view — faceted filter sidebar, sort tabs (Top / Rising / New / Live Now), infinite scroll |
| `/servers/[slug]` | Server detail — hero banner, live player count, description, tags, mods declared, vote button, wishlist button, owner info, similar servers rail |
| `/servers/[slug]/vote` | Dedicated vote page (the backlink flywheel target) — clean, fast, converts |
| `/hytale-[gamemode]-servers` | 14 SEO landing pages (survival, pvp, smp, factions, skyblock, mmorpg, towny, creative, roleplay, anarchy, minigames, modded, hardcore, adventure) |
| `/submit` | Server submission form (auth required) |
| `/search` | Full-text search results |
| `/u/[username]` | Public user profile (wishlist, lists stubbed) |
| `/sitemap.xml`, `/robots.txt` | SEO infra |

### Authenticated routes

| Route | Purpose |
|---|---|
| `/account` | Profile settings, Discord connection, vote history |
| `/account/wishlist` | Followed/bookmarked servers |
| `/dashboard` | Owner dashboard index (all servers owned) |
| `/dashboard/[serverSlug]` | Per-server owner analytics (views, votes, CTR, referrer breakdown, vote-to-join funnel stub) |
| `/dashboard/[serverSlug]/settings` | Edit description, tags, banner, mods declared, vote-reward webhook config |
| `/dashboard/[serverSlug]/claim` | Ownership claim flow (MOTD token or in-game command verification) |

### Embeddable

| Path | Purpose |
|---|---|
| `/embed/vote/[slug]` | Embeddable vote button (HTML snippet copy-paste for server websites) |
| `/embed/badge/[slug]` | Embeddable ranking badge (updates live) |

## 5. Feature Scope — Phase 1

### 5.1 Server Ingestion

- **Owner submission form:** name, IP:port, description (markdown), gamemode (required, multi-select from 14), version, region, website, Discord invite, banner upload (to Supabase Storage), mods declared (typeahead from CurseForge API by `gameId`)
- **Slug generation:** auto from server name, uniqueness-checked, owner can customize once
- **Initial state:** `unverified` (visible but low-priority in ranking until claimed)
- **Moderation:** all new submissions queued for manual review in Phase 1; auto-reject known-blocked IPs
- **Supabase Storage:** banner uploads (max 2MB, jpg/png/webp, 1200×630 recommended)

### 5.2 Live Server Pinging

- **Library:** `@hytaleone/query` NPM package (zero-dep, implements Hytale UDP V1 + V2)
- **Cadence:** every 5 minutes per server (background job), every 30–60s for server detail pages with active viewers (SWR)
- **Architecture:** Vercel Cron triggers a worker that reads `servers` where `last_polled_at < now() - 5min`, runs UDP queries in parallel (batched, 5-sec timeout), writes to `server_pings` (time-series) and updates `servers.live_player_count`, `servers.last_seen_online`, `servers.uptime_24h`, `servers.uptime_30d`
- **Fallback:** servers that block UDP query get status `unknown` with a dashboard CTA to install `nitrado/hytale-plugin-query` (the de facto plugin standard)
- **Reliability:** exponential backoff (5m → 15m → 1h) on 3 consecutive failures; server flagged `offline_since_ts`; visible decay on ranking after 72h offline

### 5.3 Voting & Ranking

**Vote flow:**
1. User lands on `/servers/[slug]/vote` (or clicks vote on detail page)
2. If not authenticated → Discord OAuth redirect (via Supabase Auth)
3. On return: fingerprint collected (FingerprintJS), IP hash, user-agent hash
4. Rate-limit check (Upstash Redis sliding window): one valid vote per user per server per 12 hours
5. Anti-fraud scoring (see 5.4): `status = 'valid' | 'shadow_invalidated'`
6. Vote written to `votes` table; next 10-minute ranking cron picks up the new signal
7. If server has the HyRank Vote Plugin installed: HMAC-signed webhook dispatched to the plugin → plugin grants configured reward in-game
8. If plugin not installed: HyRank mints a one-time redeem code → player types `/redeem <code>` in-game (plugin handles this path too)
9. If server has neither: success toast only — the UI surfaces "This server doesn't yet award vote rewards — [encourage server owner to install HyRank Vote Plugin]"

**Ranking formula** (implementation detail of the writing-plans phase, headline only here):

```
composite_score = 0.35 × bayesian_quality
                + 0.25 × hot_velocity
                + 0.20 × live_signal
                + 0.15 × retention
                + 0.05 × uptime
                - shadow_fraud_penalty
```

- **Bayesian quality:** IMDB-style `(v/(v+m))*R + (m/(v+m))*C`, with `m=50` prior, `C` = nightly-refreshed global mean. Small-n servers regress to the mean — brigading to #1 is impossible on day one.
- **Hot velocity:** Reddit formula `log10(valid_votes_last_7d) + (first_vote_unix)/45000`. Votes age out of the 7-day window → old servers can't accumulate velocity forever; new servers with momentum can.
- **Live signal:** `tanh(live_players / avg_live_players_30d)` — Twitch-style live-first; normalized so a 50-concurrent SMP doesn't get crushed by a 2000-concurrent network.
- **Retention signal:** fraction of distinct voters who re-vote within 7 days. Bots can't fake this (they don't come back on day 7).
- **Uptime signal:** rolling 30-day uptime percentage.
- **Shadow fraud penalty:** `shadow_fraud_rate × 0.4` — up to −40% for servers with high invalidation rates (bot-farming servers self-demote).
- **Monthly & all-time leaderboards:** tracked separately; prevents ossification.
- **"Rising" shelf:** a separate lane sorted by velocity alone for servers <14 days old. Product Hunt's trick — rewards new-server momentum without letting them game the main board.
- **Ranking recomputation:** pg_cron every 10 minutes, refreshes `server_signals` materialized view + writes `server_rank` table with precomputed composite. List page becomes a single indexed scan on `server_rank(composite_score DESC)`.

Phase 1 rolls its own ranking. Phase 2 adds verified-vote weighting once proof-of-play is live.

### 5.4 Anti-Fraud v1

The pipeline runs in order; each layer contributes to a `trust_score` (0–100). Final `status` is derived from the cumulative score, **not** any single layer — no bot farmer can diagnose which gate they tripped.

| Layer | Mechanism | Enforcement |
|---|---|---|
| 1 | **Discord OAuth required** | Account age < 7 days: −20 trust. No `email` scope: gate closed. Skip `guilds` scope (triggers Discord's rate-limited members endpoint, spooks users). |
| 2 | **FingerprintJS visitorId** | `SET fp:{serverId}:{visitorId} NX EX 43200` in Redis. Already present (re-vote attempt): −40 trust. |
| 3 | **IP sliding window** (Upstash Redis) | 5 votes / 10 min per `sha256(ip + pepper)`. Exceeded: −30 trust. |
| 4 | **Behavioral telemetry** (client-submitted, server-validated) | Mouse entropy (0–20 points), dwell time (>3s = +15, <500ms = −30), tab visibility (+5 / −15). |
| 5 | **Trust score verdict** | `≥40 → 'valid'`, `<40 → 'shadow_invalidated'`. **Always return 200 OK** to the client regardless — don't teach botters the boundary. |
| 6 (Phase 2) | **Proof-of-play** (HyRank Vote Plugin ed25519 sig) | Plugin posts signed `{voteId, joinedAt}` when the voter's Discord-linked Hytale account joins within 24h → vote upgraded to `verified`, weighted 2× in ranking. |

**Database enforcement:** the `votes` table has zero client-side write policies under RLS. All inserts happen exclusively in a service-role Supabase Edge Function that runs this pipeline. The 12h cooldown is enforced at the DB layer via a **generated `vote_bucket` column + partial unique index** — race conditions are structurally impossible, not merely checked.

**Log everything — including shadow rows.** `trust_score`, `visitorId`, `ip_hash`, `ua_hash` persist even on shadow-invalidated votes. This is training data for a future ML classifier.

**Public moderation log (`/trust`):** weekly aggregate showing "X votes shadow-invalidated this week, Y accounts flagged, Z servers demoted" — transparency signal incumbents cannot copy without admitting old sins.

### 5.5 Search & Faceted Filters

- **Full-text search:** Postgres `tsvector` on `servers.name + description + tags.name`; GIN index
- **Facets** (combinable, url-persistent):
  - Gamemode (multi-select from 14)
  - Region (NA / EU / AS / SA / OC / AF)
  - Version (tracks Hytale version strings from ping)
  - Player count bucket (<10, 10–50, 50–200, 200+, any)
  - Tag (community-submitted, moderated)
  - Status (online only / include offline)
  - Trust tier (Claimed / Verified / any)
- **Sort:** Top (composite), Rising (week-over-week delta), New (created_at DESC), Live Now (live_player_count DESC)

### 5.6 User Accounts

- **Auth:** Discord OAuth via Supabase Auth (primary), email+OTP as fallback
- **Profile:** username (customizable), avatar (from Discord or uploaded), short bio
- **Capabilities (Phase 1):** vote, wishlist, submit servers, claim ownership
- **Capabilities (Phase 3 stubs):** public user lists, reviews

### 5.7 Wishlist

- Follow server → notified (email via Resend) on: server back online, featured, hit milestone (Phase 2)
- Phase 1: just the follow and the unread-count UI; notifications ship as email digest only

### 5.8 Owner Claim Flow

Two verification methods (user picks — both available in Phase 1):
1. **MOTD token:** we generate a unique token (`hyrank-verify-a1b2c3d4`); owner sets it as their server MOTD; our poll confirms; claim granted. Zero infrastructure on the owner's side.
2. **In-game command:** owner runs `/hyrank claim <token>` — handled natively by the HyRank Vote Plugin (section 5.12). Faster and doesn't require a server restart. Recommended for any server already installing our plugin.

On claim: server's `owner_id` set; dashboard unlocked; trust tier bumped from `Unverified` → `Claimed`.

**Dispute path:** if two users claim the same server, the second claimant opens a dispute ticket (email to `trust@hyrank.gg`). Manual moderation in Phase 1; automated evidence collection in Phase 2.

### 5.9 Owner Dashboard (Basic)

Per server:
- **Views:** daily/weekly/monthly visits to listing + vote pages
- **Votes:** count, trend, valid vs. shadow-invalidated (owner-visible only for their servers)
- **Referrers:** top traffic sources (by UTM + referrer header)
- **Vote-to-click funnel:** % of voters who clicked IP-copy button
- **Recent events:** new reviews (stub), milestones, pings
- Charts via existing `recharts` + `@tremor/react`

### 5.10 SEO Foundations

- **Schema.org JSON-LD** injected server-rendered on every page type:
  - `VideoGame` (Hytale) at site level
  - `ItemList` on list views, gamemode pages, search results
  - `Organization` / `WebSite` sitewide
  - `BreadcrumbList` on detail pages
  - `Product`-like structured data on server detail (name, rating, image)
- **14 gamemode landing pages** (`/hytale-[gamemode]-servers`): 1200+ words each, embed top-10 server list for that gamemode, internal-linked heavily
- **Sitemap:** dynamic, Next.js 14 `sitemap.ts`; ISR-cached
- **Meta tags:** OpenGraph, Twitter cards per server
- **ISR (incremental static regeneration):** detail pages revalidate every 5min (aligned with ping cadence)
- **Core Web Vitals:** target Lighthouse ≥95 mobile (competitors average ~60)

### 5.11 Embeddable Vote Widget

- `/embed/vote/[slug]` serves a lightweight iframe-safe HTML page (clean, no auth chrome)
- Copy-paste snippet generator in owner dashboard
- Each embed-sourced vote tags `source=embed` for owner analytics
- Backlink flywheel: every embed is an inbound link to hyrank.gg/server/... — this is how we beat DA 30

### 5.12 HyRank Vote Plugin (NEW — Strategic Asset)

**Research finding:** No Votifier equivalent exists for Hytale. If we ship the canonical receiver plugin, we own the integration layer for every Hytale server's vote-reward loop — same leverage NuVotifier holds in Minecraft. Promoted from Phase 2 to Phase 1.

- **Scope:** Java 17+ Gradle plugin. Distributed via CurseForge + GitHub (`hyrank/hyrank-vote-plugin`).
- **Protocol compatibility:** ships both (a) **Votifier V2 TCP listener** — compatible with any future Votifier-speaking site, maximizing adoption, and (b) **native HyRank HTTPS webhook** — richer payload (voteId, playerName, playerUuid, timestamp, nonce) for our proof-of-play Phase 2 roadmap.
- **Config file:** `mods/HyRank/config.json` — apiKey, serverId, webhook bind port (default `game_port + 3`), reward commands, HMAC secret, replay window.
- **Webhook security:** HMAC-SHA256 over `timestamp + "." + rawBody` (Stripe pattern); 300-second replay window; 24h nonce LRU dedup; rotatable secrets with 24h overlap (Discord pattern); constant-time compare.
- **Offline player handling:** persist to `pending_rewards.json`, apply on join.
- **Fallback path (redeem codes):** for servers that can't run the plugin (home-hosted, no port forwarding), HyRank mints one-time codes post-vote, player redeems via `/redeem <code>` in-game. Ships with the plugin but also works standalone for the "we don't run any plugins" long tail — degraded UX but zero config. Estimated ~30% of home-hosted servers will need this path.
- **Dashboard integration:** owner dashboard generates API key, configures reward template, previews the JSON config snippet they drop onto their server.

Effort estimate: 2 weekends for MVP Java plugin (independent of Next.js MVP — parallelizable build workstream).

### 5.13 Migrate the Existing Waitlist

- Keep Loops.so integration; convert "Join Waitlist" CTA to "Create Account" post-launch
- Send Loops email announcing launch with one-click Discord OAuth link
- Preserve existing waitlist form for pre-claim interest in upcoming features

## 6. Data Model (Supabase Postgres)

Full schema + RLS policies are specified in the implementation plan. Phase 1 tables (headline):

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` — username, avatar, bio, trust_level |
| `servers` | Core server record — name, slug, ip, port, desc, banner_url, owner_id, status, live_player_count, last_seen_online, uptime_24h, uptime_30d, last_polled_at. **Composite score lives in `server_rank`, not here** — the servers row should never become the ranking bottleneck. |
| `tags` | Canonical tag list (seeded + community-submitted + moderated) |
| `server_tags` | Join — many-to-many, with `is_primary` |
| `gamemodes` | The 14 canonical gamemodes (normalized) |
| `server_gamemodes` | Join — servers ↔ gamemodes |
| `votes` | user_id, server_id, device_fingerprint_hash, ip_hash, ua_hash, created_at, claimed_at, status (`valid` / `shadow_invalidated` / `verified`), source |
| `wishlists` | user_id, server_id, created_at |
| `server_pings` | time-series — server_id, ts, players_online, players_max, version, motd, response_ms, is_online |
| `server_owners` | Ownership claim records — server_id, user_id, method, token, verified_at |
| `server_mods` | Join table — server_id ↔ curseforge_mod_id + declared_by (`owner`/`auto`/`admin`) + version |
| `server_analytics_daily` | Materialized daily aggregates for the owner dashboard |
| `moderation_log` | Public-readable log of fraud takedowns, bans, policy actions (anonymized) |
| `server_signals` (mat. view) | Refreshed every 10min — feeds the `server_rank` writer |
| `server_rank` | Precomputed `composite_score` per server; indexed DESC for single-scan list queries |

RLS: restrictive by default. Public-readable: `servers` (non-sensitive columns), `tags`, `gamemodes`, `server_pings`, `moderation_log`. Auth-required writes: `votes`, `wishlists`, `servers` (owner only), `server_owners`. Owner-only reads: `server_analytics_daily` for their own servers.

## 7. Tech Stack & Architecture

### Confirmed (already in repo)

- Next.js 14 (App Router) + React 18 + TypeScript strict
- Supabase (Postgres + Auth + Storage + optionally Realtime + Edge Functions)
- Stripe (held for Phase 2 — not used in Phase 1)
- Tailwind CSS + existing glassmorphism design system
- Framer Motion, @tremor/react, recharts (dashboard)
- FingerprintJS (anti-fraud fingerprint)
- Vercel Analytics

### Added in Phase 1

- **Discord OAuth** via Supabase Auth (scopes: `identify email` only — skip `guilds`)
- **`@hytaleone/query`** — Hytale UDP ping
- **`@hytaleone/votifier`** — Votifier V2 client to dispatch webhook payloads to the HyRank Vote Plugin
- **CurseForge API** — mod metadata typeahead (`api.curseforge.com`, free non-commercial tier, attribution required)
- **Upstash Redis** (serverless) — rate limiting + vote dedup sliding windows (`@upstash/ratelimit`)
- **Resend** — transactional email (wishlist notifications, claim confirmations, digest)
- **Vercel Cron** + **Postgres `pg_cron`** — ping scheduling, ranking recomputation, ping-history cleanup
- **Sentry** — error tracking
- **PostHog** — product analytics (recommended in Phase 1)
- **HyRank Vote Plugin** (parallel Java/Gradle subproject under `plugin/` in repo) — Votifier V2 + native webhook receiver

### Architectural decisions

- **Rendering strategy:** RSC + ISR for public pages (revalidate: 300s), client components for auth state, vote interactions, dashboard charts
- **Data fetching:** Supabase SSR client in RSC; SWR polling (30–60s) in client components for live player counts. **Not Supabase Realtime** for live counts — broadcasts per-row would burn connection quota; SWR + `revalidateOnFocus` gives perceived freshness without websockets.
- **Where vote inserts run:** Supabase Edge Function only (`supabase/functions/vote`), using `SUPABASE_SERVICE_ROLE_KEY`. Zero client-side write policies on `votes`. The `/api/vote` route handler simply forwards to the Edge Function.
- **Middleware contract:** `getUser()` (never `getSession()`) — session can be spoofed from cookie; `getUser` re-validates JWT with Auth server. Middleware refreshes session cookie on every request.
- **Server actions:** preferred over route handlers for form submissions (server submission, claim, wishlist toggle)
- **Background jobs:** Vercel Cron invokes Edge Functions / route handlers with a protected secret header. DB-layer jobs (`REFRESH MATERIALIZED VIEW CONCURRENTLY`, ping cleanup) run via `pg_cron`.
- **Monorepo structure:** Next.js app stays in `Hyrank/`; Java plugin lives in parallel `plugin/` directory; single repo, separate build toolchains.
- **Type safety:** Supabase `generate_typescript_types` (via the Supabase MCP) run on every schema change → checked-in `Hyrank/lib/database.types.ts`
- **Migration workflow:** SQL migrations in `Hyrank/supabase/migrations/`; apply via Supabase MCP (`create_branch` → `apply_migration` → `get_advisors` for security/performance → `merge_branch`). Never `execute_sql` for schema changes.

## 8. Error Handling & Edge Cases

- **Server offline during submission:** accept submission, mark `last_seen_online = NULL`, schedule immediate ping; show owner a warning if first ping fails
- **Duplicate submission (same IP:port):** reject with link to claim flow on existing record
- **Discord OAuth failure:** fallback to email+OTP; always preserve vote intent across login redirects
- **Vote during Redis outage:** accept vote, write to DB with `status = 'pending_validation'`, async validation job upgrades/invalidates
- **Ping library timeout / unknown response:** mark `status = 'unknown'`, do not mark offline until 3 consecutive failures
- **Rate limit exceeded:** show user-friendly "Already voted recently, come back in Xh" message (not raw 429)
- **Owner claim race:** optimistic locking with `server_owners.created_at DESC LIMIT 1`; second claimant sees "already claimed" and can dispute
- **Fingerprint unavailable** (privacy extensions): fall back to stronger IP + UA + behavioral heuristic scoring; do not hard-block
- **Banner upload failure:** non-blocking; server created with placeholder
- **Sitemap size:** split if >50k URLs (Phase 1 unlikely to hit this)

## 9. Testing Strategy

- **Unit:** Vitest for pure functions (ranking formula, anti-fraud scoring, slug generation, MOTD token generation)
- **Integration:** Playwright for critical user paths — submission, vote flow, claim flow, dashboard
- **Schema / RLS tests:** Supabase CLI `db test` or `pgTAP` — every RLS policy has a test that enforces a denied access and an allowed access
- **Load test:** k6 script simulating 1000 concurrent vote submissions; assert anti-fraud pipeline holds up
- **Lighthouse CI:** ≥95 mobile on list + detail + gamemode pages per PR
- **Manual QA checklist:** mobile vote flow on real iPhone/Android before launch (this is the #1 competitor failure point; we can't regress here)

## 10. SEO / Launch Plan (embedded in Phase 1 scope)

- Week 1: ship 14 gamemode landing pages + schema.org + sitemap
- Week 2: seed embed vote-widget among first 50 owners
- Week 3–6: publish 2 informational posts per week from the SEO agent's 90-day plan
- Week 7–10: outreach to 20 mid-tier Hytale YouTubers (partner placements, free featured)
- Week 11–13: Reddit AMA, Hytale Discord partnership outreach, monthly "Hytale Server Awards" PR moment

The Hytale community trust layer, editorial/sales firewall, and public moderation log establish the posture to approach Hytale Inc. about partnership/blessing during Phase 2.

## 11. Open Questions (to resolve during writing-plans or before launch)

1. **Hytale version cadence:** how aggressively does Hytale ship server-breaking updates? May require `version_compat` surfacing in search. Monitor `hytale.com/news` during Phase 1.
2. **CurseForge commercial tier:** Phase 1 uses free non-commercial; once we monetize (Phase 2) we need Overwolf partnerships agreement. Timing: before Phase 2 launch.
3. **"Official Hytale Server List" outreach timing:** pre-launch quietly, or post-launch once we have metrics? Decision during Phase 1 wrap-up; recommend post-launch with ≥1000 servers as leverage.
4. **Domain:** is hyrank.gg registered? (Referenced in existing waitlist copy — assume yes, confirm during Phase 1 kickoff.)
5. **Seeding strategy:** manual onboarding of 50 servers from competitor sites requires reaching out to owners (or scraping public listings, which competitors may not love). Decide ethics/approach before week 1.
6. **Plugin distribution timing:** do we publish the HyRank Vote Plugin on CurseForge on day one or wait until we have signups to avoid premature exposure? Recommend soft-launch (GitHub first, CurseForge two weeks later once dashboard API key generation works).

## 12. Success Criteria (Phase 1 exit bar)

- 500+ servers listed (seeded from competitor sites + manual onboarding of the 50 most-viewed from hytale-servers.com, hytaletop100.com, hytaleserverlist.me)
- 5,000 authenticated users
- 50,000 valid votes recorded; <2% shadow-invalidation rate (if higher, anti-fraud tuning needed)
- Lighthouse ≥95 mobile on top 10 landing pages
- Ranking top-5 in Google for 5+ long-tail gamemode keywords
- 20+ embedded vote widgets on server websites (backlink flywheel operational)
- Zero incidents of undisclosed paid-ranking / editorial compromise (trust posture intact)

## 13. What Happens After Phase 1

- **Phase 2 — Trust & Monetization:** Stripe featured slot purchases ($25–50/mo fixed tier), premium owner analytics tier ($25/mo), hosting affiliates (Apex 15% recurring, Bisect partner), public moderation log v2, **proof-of-play cryptographic vote verification** (ed25519 signing via HyRank Vote Plugin extended), auto-detection of installed mods via plugin scan
- **Phase 3 — Community Platform:** per-server community feeds, user-created public lists (Letterboxd-style), reviews with reviewer verification, Rising/New/Editor's Picks rails, notification system, creator profiles
- **Phase 4 — Ecosystem:** Discord bot, white-label ranking widget, public REST API, CurseForge deep sync + partnership, B2B partner tier for hosting companies

Each phase gets its own spec → plan → build cycle, brainstormed when the prior phase lands.
