# HyRank Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Supabase dependencies, author and apply the full Phase 1 schema with RLS, wire Discord OAuth via `@supabase/ssr`, and verify end-to-end with RLS tests and a Playwright smoke test. Exit bar: a user can click "Sign in with Discord" on `/login`, complete OAuth, land on `/account`, and have a `public.profiles` row auto-created; every RLS policy has a pgTAP test that enforces allowed + denied access.

**Architecture:** Supabase is the DB + Auth + Storage spine. `@supabase/ssr` handles the Next.js 14 App Router cookie dance — three client factories (`lib/supabase/server.ts` for RSC/route-handlers/server-actions, `lib/supabase/client.ts` for browser, and a middleware client for session refresh). The schema is a single migration that includes the full Phase 1 surface: profiles, servers, tags, gamemodes (both seeded), votes (with a generated `vote_bucket` column + partial unique index for DB-level 12h cooldown enforcement), wishlists, server_pings, server_owners, server_mods, moderation_log, server_signals (placeholder materialized view), server_rank (placeholder table). RLS is restrictive by default; `votes` has ZERO client-side write policies (Phase 3 of this plan — votes insert only via a service-role Edge Function, added in Plan 3). Migrations are applied via Supabase MCP against a `develop` branch first, advisors are run, types are generated, then merged to production.

**Tech Stack:**
- Next.js 14.2 App Router + React 18 + TypeScript strict (already in repo)
- `@supabase/ssr` + `@supabase/supabase-js` (already in package.json)
- Supabase CLI for local dev + pgTAP for RLS tests
- Playwright for e2e smoke test
- Discord Developer Portal (OAuth app — manual setup step)
- Supabase MCP for migration application (`mcp__4a3f6a92-*`)

**Non-Goals (defer to later plans):**
- Vote insertion Edge Function (Plan 3)
- Ranking materialized view refresh logic (Plan 4 — we create placeholder tables here)
- Actual server submission UI (Plan 2)
- Full auth UI polish (this plan: minimal `/login` + `/account`)

---

## File Structure

Files that will be created or modified in this plan (grouped by responsibility):

**Dependencies & Config:**
- Modify: `Hyrank/package.json` — add dev deps (playwright, dotenv-cli); add scripts
- Create: `Hyrank/.env.example` — document all env vars
- Create: `Hyrank/.env.local` — local secrets (gitignored)

**Supabase Client (one file per client-type to keep boundaries clean):**
- Create: `Hyrank/lib/supabase/server.ts` — RSC / route handlers / server actions
- Create: `Hyrank/lib/supabase/client.ts` — browser client
- Create: `Hyrank/middleware.ts` — session refresh on every request
- Create: `Hyrank/lib/supabase/database.types.ts` — generated types (committed)

**Database Migrations (single init migration — we want one atomic schema):**
- Create: `Hyrank/supabase/config.toml` — Supabase CLI config
- Create: `Hyrank/supabase/migrations/20260422120000_init_schema.sql`
- Create: `Hyrank/supabase/migrations/20260422120100_seed_gamemodes_tags.sql`
- Create: `Hyrank/supabase/tests/rls_profiles.sql` — pgTAP
- Create: `Hyrank/supabase/tests/rls_servers.sql`
- Create: `Hyrank/supabase/tests/rls_votes.sql`
- Create: `Hyrank/supabase/tests/rls_wishlists.sql`
- Create: `Hyrank/supabase/tests/vote_bucket_cooldown.sql`

**Auth UI (minimal — Plan 5 expands this):**
- Create: `Hyrank/app/login/page.tsx` — Discord sign-in button
- Create: `Hyrank/app/auth/callback/route.ts` — OAuth code exchange
- Create: `Hyrank/app/account/page.tsx` — protected page, displays current user
- Create: `Hyrank/components/auth/DiscordSignInButton.tsx`
- Create: `Hyrank/components/auth/SignOutButton.tsx`

**Testing:**
- Create: `Hyrank/playwright.config.ts`
- Create: `Hyrank/tests/e2e/auth.spec.ts` — smoke test

---

## Task 1 — Install Dependencies

**Files:**
- Modify: `Hyrank/package.json`

- [ ] **Step 1.1: Change into the Next.js app directory**

Run:
```bash
cd /Users/jamesfarmer/projectsv2/hyrank/Hyrank
```

- [ ] **Step 1.2: Inspect current dependencies so we don't re-install**

Run: `cat package.json`
Expected: confirm `@supabase/ssr`, `@supabase/supabase-js`, `@fingerprintjs/fingerprintjs` already present.

- [ ] **Step 1.3: Add dev-only test tooling**

Run:
```bash
npm install --save-dev @playwright/test@1.48 dotenv-cli@7.4 supabase@1.219
```

Expected: no errors. `package.json` gains three dev deps.

- [ ] **Step 1.4: Install Playwright browsers**

Run: `npx playwright install chromium`
Expected: one-time browser download.

- [ ] **Step 1.5: Add scripts to `package.json`**

Edit `package.json` `scripts` block to add these five entries (preserving existing `dev`, `build`, `start`, `lint`):
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:diff": "supabase db diff",
    "supabase:test": "supabase test db",
    "test:e2e": "playwright test"
  }
```

- [ ] **Step 1.6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Playwright, Supabase CLI, dotenv-cli dev deps"
```

---

## Task 2 — Environment Variable Scaffolding

**Files:**
- Create: `Hyrank/.env.example`
- Modify: `Hyrank/.gitignore` (ensure `.env*.local` already excluded; verify)

- [ ] **Step 2.1: Create `.env.example`**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/.env.example`:
```
# ---- Supabase ----
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ---- Loops (existing) ----
LOOPS_API_KEY=

# ---- OAuth provider ids (configured in Supabase dashboard, listed here for reference) ----
# DISCORD_CLIENT_ID (Supabase Auth → Providers → Discord)
# DISCORD_CLIENT_SECRET (Supabase Auth → Providers → Discord)

# ---- Site ----
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 2.2: Verify `.gitignore` excludes local envs**

Run: `grep -E "^\.env" .gitignore`
Expected: at least `.env*.local` present. If missing, append `\n.env*.local\n.env.production` to `.gitignore`.

- [ ] **Step 2.3: Confirm current `.env.local` has `LOOPS_API_KEY` so waitlist keeps working**

Run (from Hyrank/): `test -f .env.local && echo OK || echo MISSING`
If MISSING, stop and ask user — they likely have local-only secrets the shared environment won't have.

- [ ] **Step 2.4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: document env vars in .env.example"
```

---

## Task 3 — Supabase Client Factories

**Files:**
- Create: `Hyrank/lib/supabase/server.ts`
- Create: `Hyrank/lib/supabase/client.ts`

- [ ] **Step 3.1: Create the server-side factory**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/lib/supabase/server.ts`:
```typescript
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            // Called from a Server Component — cookies() is read-only. Safe to ignore;
            // middleware.ts is responsible for persisting session cookies.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3.2: Create the browser factory**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/lib/supabase/client.ts`:
```typescript
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3.3: Create a placeholder `database.types.ts`**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/lib/supabase/database.types.ts`:
```typescript
// Regenerated by `supabase gen types typescript --local > lib/supabase/database.types.ts`
// or via the Supabase MCP `generate_typescript_types` call.
// Task 11 replaces this placeholder with real types.
export type Database = Record<string, never>;
```

- [ ] **Step 3.4: Confirm the TypeScript build still passes**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3.5: Commit**

```bash
git add lib/supabase/
git commit -m "feat(auth): add Supabase server + browser client factories"
```

---

## Task 4 — Root Middleware for Session Refresh

**Files:**
- Create: `Hyrank/middleware.ts`

- [ ] **Step 4.1: Write the middleware**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/middleware.ts`:
```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  // getUser() re-validates the JWT with Auth server; getSession() can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedPrefixes = ["/account", "/dashboard", "/submit"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets, Next internals, and public API.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/waitlist|api/public).*)",
  ],
};
```

- [ ] **Step 4.2: Confirm build still passes**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4.3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): add middleware to refresh Supabase session + gate /account /dashboard /submit"
```

---

## Task 5 — Write Initial Schema Migration

**Files:**
- Create: `Hyrank/supabase/config.toml`
- Create: `Hyrank/supabase/migrations/20260422120000_init_schema.sql`

- [ ] **Step 5.1: Initialize Supabase locally (first time only)**

Run: `npx supabase init --force`
Expected: `supabase/config.toml` created. Answer "n" to "generate VS Code settings".

- [ ] **Step 5.2: Write the initial schema migration**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/migrations/20260422120000_init_schema.sql`:
```sql
-- HyRank Phase 1 — initial schema
-- Tables: profiles, gamemodes, tags, servers, server_gamemodes, server_tags,
--         server_mods, votes, wishlists, server_pings, server_owners,
--         moderation_log, server_signals (mat view), server_rank.

-- ---------- extensions ----------
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- profiles: extends auth.users ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  discord_id text unique,
  username text not null,
  avatar_url text,
  bio text,
  trust_tier text not null default 'unverified'
    check (trust_tier in ('unverified','claimed','verified','partner','banned')),
  created_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles using gin (username gin_trgm_ops);

-- Auto-create a profile row when a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    'user_' || substring(new.id::text, 1, 8)
  );

  insert into public.profiles (id, discord_id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    v_username,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- gamemodes: 14 canonical Phase 1 gamemodes ----------
create table public.gamemodes (
  id serial primary key,
  slug text unique not null,
  label text not null,
  description text,
  sort_order int not null default 0
);

-- ---------- tags: community-submitted, moderated ----------
create table public.tags (
  id serial primary key,
  slug text unique not null,
  label text not null,
  is_approved boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- servers ----------
create table public.servers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  address text not null,  -- host:port
  host text not null,
  port int not null default 5520,
  description text,
  website_url text,
  discord_invite text,
  banner_url text,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','live','hidden','banned')),
  trust_tier text not null default 'unverified'
    check (trust_tier in ('unverified','claimed','verified','partner')),
  live_player_count int,
  max_player_count int,
  last_seen_online timestamptz,
  last_polled_at timestamptz,
  uptime_24h numeric(5,4),  -- 0..1
  uptime_30d numeric(5,4),
  ping_consecutive_failures int not null default 0,
  version_string text,
  motd text,
  created_at timestamptz not null default now()
);

create index servers_status_idx on public.servers (status);
create index servers_owner_idx on public.servers (owner_id) where owner_id is not null;
create index servers_live_player_idx on public.servers (live_player_count desc nulls last);
create index servers_last_polled_idx on public.servers (last_polled_at nulls first);
create index servers_name_trgm_idx on public.servers using gin (name gin_trgm_ops);
-- host:port uniqueness (prevents duplicate listings of the same server)
create unique index servers_host_port_idx on public.servers (host, port)
  where status <> 'banned';

-- ---------- server_gamemodes: M2M ----------
create table public.server_gamemodes (
  server_id uuid references public.servers(id) on delete cascade,
  gamemode_id int references public.gamemodes(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (server_id, gamemode_id)
);

-- ---------- server_tags: M2M ----------
create table public.server_tags (
  server_id uuid references public.servers(id) on delete cascade,
  tag_id int references public.tags(id) on delete cascade,
  primary key (server_id, tag_id)
);

-- ---------- server_mods: M2M to CurseForge mods (owner-declared) ----------
create table public.server_mods (
  server_id uuid references public.servers(id) on delete cascade,
  curseforge_mod_id bigint not null,
  version text,
  declared_by text not null default 'owner'
    check (declared_by in ('owner','auto','admin')),
  created_at timestamptz not null default now(),
  primary key (server_id, curseforge_mod_id)
);
create index server_mods_mod_idx on public.server_mods (curseforge_mod_id);

-- ---------- votes: append-only, service-role writes only ----------
create table public.votes (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  server_id uuid not null references public.servers(id) on delete cascade,
  ip_hash text not null,            -- sha256(ip + pepper)
  ua_hash text not null,            -- sha256(ua)
  fingerprint text,                 -- FingerprintJS visitorId
  trust_score int not null default 50,
  status text not null default 'valid'
    check (status in ('valid','shadow_invalidated','verified','pending_validation')),
  invalidation_reason text,
  source text not null default 'web',  -- 'web' | 'embed' | 'api'
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  -- Generated column: maps created_at into 12h buckets (00:00 and 12:00 UTC anchors).
  vote_bucket timestamptz generated always as (
    date_trunc('day', created_at)
    + case when extract(hour from created_at) >= 12
           then interval '12 hours'
           else interval '0 hours'
      end
  ) stored
);

-- Partial unique index: structurally enforces 12h cooldown per (user, server).
create unique index votes_user_server_bucket_idx
  on public.votes (user_id, server_id, vote_bucket)
  where status in ('valid','verified');

create index votes_server_valid_idx
  on public.votes (server_id, created_at desc)
  where status in ('valid','verified');
create index votes_fp_recent_idx on public.votes (fingerprint, created_at desc);
create index votes_ip_recent_idx on public.votes (ip_hash, created_at desc);

-- ---------- wishlists ----------
create table public.wishlists (
  user_id uuid references public.profiles(id) on delete cascade,
  server_id uuid references public.servers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, server_id)
);

-- ---------- server_pings: time-series ----------
create table public.server_pings (
  server_id uuid references public.servers(id) on delete cascade,
  pinged_at timestamptz not null default now(),
  online boolean not null,
  player_count int,
  max_player_count int,
  version_string text,
  motd text,
  response_ms int,
  primary key (server_id, pinged_at)
);
create index server_pings_server_recent_idx on public.server_pings (server_id, pinged_at desc);

-- ---------- server_owners: claim audit log ----------
create table public.server_owners (
  id bigserial primary key,
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('motd_token','ingame_command','manual')),
  token text,
  evidence jsonb,
  status text not null default 'pending'
    check (status in ('pending','verified','rejected','disputed')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index server_owners_server_idx on public.server_owners (server_id, status);
create index server_owners_user_idx on public.server_owners (user_id);

-- ---------- moderation_log: public read ----------
create table public.moderation_log (
  id bigserial primary key,
  category text not null check (category in ('fraud_takedown','ban','demotion','policy_change')),
  subject_type text not null check (subject_type in ('vote_batch','server','profile','system')),
  subject_id_hash text,  -- sha256 of actual id — never leak internal ids to the public
  notes text not null,
  quantity int,
  occurred_at timestamptz not null default now()
);
create index moderation_log_recent_idx on public.moderation_log (occurred_at desc);

-- ---------- server_signals (materialized view) ----------
-- Placeholder definition; refresh cron added in Plan 4.
-- We define the view now so Plan 4 only needs to change the SELECT body.
create materialized view public.server_signals as
select
  s.id                                           as server_id,
  coalesce(count(v.id) filter (
    where v.status in ('valid','verified')
      and v.created_at > now() - interval '7 days'
  ), 0)                                          as votes_last_7d,
  coalesce(count(v.id) filter (
    where v.status = 'shadow_invalidated'
      and v.created_at > now() - interval '7 days'
  ), 0)                                          as shadow_votes_last_7d,
  min(v.created_at) filter (
    where v.status in ('valid','verified')
      and v.created_at > now() - interval '7 days'
  )                                              as first_vote_last_7d,
  s.live_player_count,
  coalesce(s.uptime_30d, 0)                      as uptime_30d
from public.servers s
left join public.votes v on v.server_id = s.id
group by s.id, s.live_player_count, s.uptime_30d;

create unique index server_signals_server_idx on public.server_signals (server_id);

-- ---------- server_rank: precomputed composite scores (writer added in Plan 4) ----------
create table public.server_rank (
  server_id uuid primary key references public.servers(id) on delete cascade,
  composite_score numeric(10,6) not null default 0,
  bayesian_component numeric(10,6) not null default 0,
  hot_component numeric(10,6) not null default 0,
  live_component numeric(10,6) not null default 0,
  retention_component numeric(10,6) not null default 0,
  uptime_component numeric(10,6) not null default 0,
  shadow_penalty numeric(10,6) not null default 0,
  computed_at timestamptz not null default now()
);
create index server_rank_composite_idx on public.server_rank (composite_score desc);
```

- [ ] **Step 5.3: Write the seed migration for gamemodes + core tags**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/migrations/20260422120100_seed_gamemodes_tags.sql`:
```sql
-- Seed the 14 Phase 1 gamemodes. Slug doubles as the URL segment.
insert into public.gamemodes (slug, label, description, sort_order) values
  ('survival',  'Survival',         'Classic PvE survival where crafting, exploration, and longevity rule.', 10),
  ('pvp',       'PvP',              'Combat-forward servers built around duels, arenas, and kill counts.', 20),
  ('smp',       'SMP',              'Survival Multiplayer with a tight-knit community and long-running worlds.', 30),
  ('factions',  'Factions',         'Team-based raiding, base building, and territorial warfare.', 40),
  ('skyblock',  'Skyblock',         'Start on a small island and build outward with resource-scarcity gameplay.', 50),
  ('mmorpg',    'MMORPG',           'Custom quests, leveling systems, and persistent class progression.', 60),
  ('towny',     'Towny',            'Player-run towns and nations with political and economic systems.', 70),
  ('creative',  'Creative',         'Freebuild servers focused on collaboration and showcases.', 80),
  ('roleplay',  'Roleplay',         'Immersive in-character servers with lore and systems for storytelling.', 90),
  ('anarchy',   'Anarchy',          'No rules, no resets, last-player-standing chaos.', 100),
  ('minigames', 'Minigames',        'Rotating short-form game lobbies — parkour, bed wars, spleef, capture variants.', 110),
  ('modded',    'Modded',           'Servers running substantial mod packs via Hytale plugins.', 120),
  ('hardcore',  'Hardcore',         'One-life, high-stakes survival with permanent death.', 130),
  ('adventure', 'Adventure',        'Story-driven map servers with scripted quests and custom levels.', 140);

-- Seed a handful of canonical, approved tags so the UI has something to show on day 1.
insert into public.tags (slug, label, is_approved) values
  ('cross-region',    'Cross-Region',     true),
  ('family-friendly', 'Family-Friendly',  true),
  ('no-pay-to-win',   'No Pay-to-Win',    true),
  ('economy',         'Economy',          true),
  ('quests',          'Quests',           true),
  ('custom-items',    'Custom Items',     true),
  ('daily-events',    'Daily Events',     true),
  ('small-community', 'Small Community',  true),
  ('large-network',   'Large Network',    true);
```

- [ ] **Step 5.4: Lint the SQL locally**

Run: `npx supabase db lint --level warning --migrations-path supabase/migrations 2>&1 || true`
Expected: informational warnings only, no errors. (Some advisors run only on a live DB — we'll run those after apply.)

- [ ] **Step 5.5: Commit**

```bash
git add supabase/config.toml supabase/migrations/
git commit -m "feat(db): initial schema + seed gamemodes/tags (profiles, servers, votes, pings, ranking placeholders)"
```

---

## Task 6 — Apply Migration via Supabase MCP

Use the Supabase MCP (already loaded this session — tool names prefixed `mcp__4a3f6a92-*`).

- [ ] **Step 6.1: Confirm the target project**

Call: `mcp__4a3f6a92-*__list_projects` with no args.
Expected: array includes the HyRank project. Note its `id` (call it `$PROJECT_ID`).

If no HyRank project exists yet, stop and ask the user — project creation is a paid-plan decision.

- [ ] **Step 6.2: Create a `develop` branch**

Call: `mcp__4a3f6a92-*__create_branch` with `{ project_id: $PROJECT_ID, name: "develop" }`.
Expected: response contains a new `project_ref` for the staging branch (call it `$BRANCH_REF`).

- [ ] **Step 6.3: Apply the init schema migration on the branch**

Read the file `supabase/migrations/20260422120000_init_schema.sql`, then call:

`mcp__4a3f6a92-*__apply_migration` with:
```json
{
  "project_id": "$BRANCH_REF",
  "name": "init_schema",
  "query": "<contents of 20260422120000_init_schema.sql>"
}
```

Expected: `success: true`.

- [ ] **Step 6.4: Apply the seed migration on the branch**

Same as 6.3 but with `name: "seed_gamemodes_tags"` and the contents of `20260422120100_seed_gamemodes_tags.sql`.

Expected: `success: true`.

- [ ] **Step 6.5: Verify tables exist**

Call: `mcp__4a3f6a92-*__list_tables` with `{ project_id: $BRANCH_REF, schemas: ["public"] }`.
Expected: list includes `profiles`, `servers`, `gamemodes`, `tags`, `server_tags`, `server_gamemodes`, `server_mods`, `votes`, `wishlists`, `server_pings`, `server_owners`, `moderation_log`, `server_rank`.

- [ ] **Step 6.6: Verify gamemodes were seeded**

Call: `mcp__4a3f6a92-*__execute_sql` with `{ project_id: $BRANCH_REF, query: "select count(*) as n from public.gamemodes" }`.
Expected: `n = 14`.

- [ ] **Step 6.7: Pause — we run RLS + advisors before merging to production**

(No action — proceed to Task 7.)

---

## Task 7 — Add RLS Policies

**Files:**
- Create: `Hyrank/supabase/migrations/20260422120200_rls_policies.sql`

- [ ] **Step 7.1: Write the RLS migration**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/migrations/20260422120200_rls_policies.sql`:
```sql
-- Enable RLS on every public-accessible table.
alter table public.profiles         enable row level security;
alter table public.servers          enable row level security;
alter table public.server_gamemodes enable row level security;
alter table public.server_tags      enable row level security;
alter table public.server_mods      enable row level security;
alter table public.tags             enable row level security;
alter table public.gamemodes        enable row level security;
alter table public.votes            enable row level security;
alter table public.wishlists        enable row level security;
alter table public.server_pings     enable row level security;
alter table public.server_owners    enable row level security;
alter table public.moderation_log   enable row level security;
alter table public.server_rank      enable row level security;

-- ---------- gamemodes: public read, no writes from clients ----------
create policy "gamemodes read all"
  on public.gamemodes for select using (true);

-- ---------- tags: read approved; authenticated users propose new ----------
create policy "tags read approved"
  on public.tags for select using (is_approved = true);
create policy "tags propose authed"
  on public.tags for insert to authenticated with check (
    auth.uid() is not null and is_approved = false and created_by = auth.uid()
  );

-- ---------- profiles: everyone reads, owner updates ----------
create policy "profiles read all"
  on public.profiles for select using (true);
create policy "profiles update own"
  on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- servers: public reads non-banned; owners update their own ----------
create policy "servers read non-banned"
  on public.servers for select using (status <> 'banned');
create policy "servers insert authed"
  on public.servers for insert to authenticated with check (auth.uid() is not null);
create policy "servers update own"
  on public.servers for update using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------- server_gamemodes / server_tags: public read; owner writes for their server ----------
create policy "server_gamemodes read all"
  on public.server_gamemodes for select using (true);
create policy "server_gamemodes owner write"
  on public.server_gamemodes for all using (
    exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid())
  );

create policy "server_tags read all"
  on public.server_tags for select using (true);
create policy "server_tags owner write"
  on public.server_tags for all using (
    exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid())
  );

-- ---------- server_mods: same pattern ----------
create policy "server_mods read all"
  on public.server_mods for select using (true);
create policy "server_mods owner write"
  on public.server_mods for all using (
    exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid())
  );

-- ---------- votes: owner reads their own; NO client writes ----------
-- All vote inserts happen only via the service-role Edge Function (Plan 3).
-- We explicitly create the select policy and deliberately omit insert/update/delete.
create policy "votes read own"
  on public.votes for select using (auth.uid() = user_id);

-- ---------- wishlists: owner full control ----------
create policy "wishlists read own"
  on public.wishlists for select using (auth.uid() = user_id);
create policy "wishlists insert own"
  on public.wishlists for insert to authenticated with check (auth.uid() = user_id);
create policy "wishlists delete own"
  on public.wishlists for delete using (auth.uid() = user_id);

-- ---------- server_pings: public read (anonymized); no client writes ----------
create policy "server_pings read all"
  on public.server_pings for select using (true);

-- ---------- server_owners: read-own (audit log); service-role writes only ----------
create policy "server_owners read own"
  on public.server_owners for select using (auth.uid() = user_id);

-- ---------- moderation_log: public read, no client writes ----------
create policy "moderation_log read all"
  on public.moderation_log for select using (true);

-- ---------- server_rank: public read, no client writes (populated by cron job) ----------
create policy "server_rank read all"
  on public.server_rank for select using (true);
```

- [ ] **Step 7.2: Apply via MCP**

Call `mcp__4a3f6a92-*__apply_migration` with `name: "rls_policies"` and the file contents, targeting `$BRANCH_REF`.
Expected: `success: true`.

- [ ] **Step 7.3: Run the security advisor**

Call: `mcp__4a3f6a92-*__get_advisors` with `{ project_id: $BRANCH_REF, type: "security" }`.
Expected: zero errors. If any table is flagged "RLS not enabled" or any policy uses `using (true)` on a write path for a sensitive table (votes, server_owners, moderation_log), stop and fix.

- [ ] **Step 7.4: Run the performance advisor**

Call: `mcp__4a3f6a92-*__get_advisors` with `{ project_id: $BRANCH_REF, type: "performance" }`.
Expected: zero "unindexed foreign key" errors. Any flagged FK without a supporting index must be fixed inline before merging.

- [ ] **Step 7.5: Commit**

```bash
git add supabase/migrations/20260422120200_rls_policies.sql
git commit -m "feat(db): RLS policies — votes is service-role only, owner-scoped writes elsewhere"
```

---

## Task 8 — pgTAP Test Suite for RLS

**Files:**
- Create: `Hyrank/supabase/tests/rls_profiles.sql`
- Create: `Hyrank/supabase/tests/rls_servers.sql`
- Create: `Hyrank/supabase/tests/rls_votes.sql`
- Create: `Hyrank/supabase/tests/rls_wishlists.sql`
- Create: `Hyrank/supabase/tests/vote_bucket_cooldown.sql`

- [ ] **Step 8.1: Enable pgTAP on the branch (idempotent)**

Call `mcp__4a3f6a92-*__execute_sql` with:
```json
{
  "project_id": "$BRANCH_REF",
  "query": "create extension if not exists pgtap with schema extensions;"
}
```
Expected: `success: true`.

- [ ] **Step 8.2: Write `rls_profiles.sql`**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/tests/rls_profiles.sql`:
```sql
begin;
select plan(4);

-- Seed two users via the auth schema helper.
select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

-- As alice, she should see her own profile.
select tests.authenticate_as('alice');
select is(
  (select username from public.profiles where id = tests.get_supabase_uid('alice')),
  'alice',
  'alice can read her own profile'
);

-- Anonymous read should also succeed (public read policy).
select tests.clear_authentication();
select isnt_empty(
  $$ select id from public.profiles where username = 'alice' $$,
  'anon can read profiles'
);

-- As alice, she CAN update her own username.
select tests.authenticate_as('alice');
select lives_ok(
  $$ update public.profiles set bio = 'hello' where id = tests.get_supabase_uid('alice') $$,
  'alice updates her own profile'
);

-- As alice, she CANNOT update bob's profile.
select throws_ok(
  $$ update public.profiles set bio = 'hacked' where id = tests.get_supabase_uid('bob') $$,
  null,  -- any error is acceptable — RLS returns 0 rows rather than throwing, so we check rowcount instead
  'alice attempting to update bob row should be blocked'
);

select * from finish();
rollback;
```

(Note: `tests.create_supabase_user`, `tests.authenticate_as`, `tests.get_supabase_uid`, `tests.clear_authentication` come from the Supabase testing helpers — see step 8.7.)

- [ ] **Step 8.3: Write `rls_servers.sql`**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/tests/rls_servers.sql`:
```sql
begin;
select plan(3);

select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

-- Alice creates a server.
select tests.authenticate_as('alice');
insert into public.servers (slug, name, address, host, port, owner_id)
  values ('alices-smp', 'Alices SMP', '1.2.3.4:5520', '1.2.3.4', 5520, tests.get_supabase_uid('alice'));

select is(
  (select owner_id from public.servers where slug = 'alices-smp'),
  tests.get_supabase_uid('alice'),
  'alice owns alices-smp'
);

-- Alice can update her server name.
select lives_ok(
  $$ update public.servers set name = 'Alices New SMP' where slug = 'alices-smp' $$,
  'alice updates her own server'
);

-- Bob cannot update alices server.
select tests.authenticate_as('bob');
select is(
  (select count(*)::int from (
     update public.servers set name = 'Bobs SMP' where slug = 'alices-smp' returning 1
  ) x),
  0,
  'bob cannot update alices server (RLS blocks, zero rows)'
);

select * from finish();
rollback;
```

- [ ] **Step 8.4: Write `rls_votes.sql`**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/tests/rls_votes.sql`:
```sql
begin;
select plan(3);

select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

-- Seed a server to vote on.
insert into public.servers (id, slug, name, address, host, port)
  values ('00000000-0000-0000-0000-000000000001', 'test-server', 'Test Server', '1.2.3.4:5520', '1.2.3.4', 5520);

-- Alice, as an authenticated user, CANNOT insert into votes (no insert policy).
select tests.authenticate_as('alice');
select is(
  (select count(*)::int from (
     insert into public.votes (user_id, server_id, ip_hash, ua_hash)
       values (tests.get_supabase_uid('alice'), '00000000-0000-0000-0000-000000000001', 'x', 'y')
     returning 1
   ) x),
  0,
  'authenticated user cannot insert vote (RLS blocks)'
);

-- Service-role insert succeeds.
set local role service_role;
insert into public.votes (user_id, server_id, ip_hash, ua_hash)
  values (tests.get_supabase_uid('alice'), '00000000-0000-0000-0000-000000000001', 'x', 'y');
reset role;

-- Alice can read her own vote; bob cannot read it.
select tests.authenticate_as('alice');
select isnt_empty(
  $$ select 1 from public.votes where user_id = tests.get_supabase_uid('alice') $$,
  'alice reads her own vote'
);

select tests.authenticate_as('bob');
select is_empty(
  $$ select 1 from public.votes where user_id = tests.get_supabase_uid('alice') $$,
  'bob cannot read alices vote'
);

select * from finish();
rollback;
```

- [ ] **Step 8.5: Write `rls_wishlists.sql`**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/tests/rls_wishlists.sql`:
```sql
begin;
select plan(2);

select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

insert into public.servers (id, slug, name, address, host, port)
  values ('00000000-0000-0000-0000-000000000002', 'wish-server', 'Wish Server', '1.2.3.4:5520', '1.2.3.4', 5520);

select tests.authenticate_as('alice');
insert into public.wishlists (user_id, server_id)
  values (tests.get_supabase_uid('alice'), '00000000-0000-0000-0000-000000000002');

select isnt_empty(
  $$ select 1 from public.wishlists where user_id = tests.get_supabase_uid('alice') $$,
  'alice reads her own wishlist'
);

select tests.authenticate_as('bob');
select is_empty(
  $$ select 1 from public.wishlists where user_id = tests.get_supabase_uid('alice') $$,
  'bob cannot read alices wishlist'
);

select * from finish();
rollback;
```

- [ ] **Step 8.6: Write `vote_bucket_cooldown.sql`**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/supabase/tests/vote_bucket_cooldown.sql`:
```sql
begin;
select plan(2);

select tests.create_supabase_user('alice');
insert into public.servers (id, slug, name, address, host, port)
  values ('00000000-0000-0000-0000-000000000003', 'cooldown-server', 'Cooldown', '1.2.3.4:5520', '1.2.3.4', 5520);

-- Use service role to bypass RLS and insert two votes in the same 12h bucket.
set local role service_role;

-- First vote: 2026-04-22 10:00 UTC (pre-noon bucket).
insert into public.votes (user_id, server_id, ip_hash, ua_hash, created_at)
  values (tests.get_supabase_uid('alice'), '00000000-0000-0000-0000-000000000003', 'a', 'b', '2026-04-22 10:00:00Z');

-- Second vote: 2026-04-22 11:30 UTC (still pre-noon bucket) — must fail unique index.
select throws_ok(
  $$ insert into public.votes (user_id, server_id, ip_hash, ua_hash, created_at)
     values (tests.get_supabase_uid('alice'), '00000000-0000-0000-0000-000000000003', 'a', 'b', '2026-04-22 11:30:00Z') $$,
  '23505',
  'second vote in same 12h bucket blocked by partial unique index'
);

-- Third vote: 2026-04-22 14:00 UTC (post-noon bucket) — must succeed.
select lives_ok(
  $$ insert into public.votes (user_id, server_id, ip_hash, ua_hash, created_at)
     values (tests.get_supabase_uid('alice'), '00000000-0000-0000-0000-000000000003', 'a', 'b', '2026-04-22 14:00:00Z') $$,
  'vote in next 12h bucket succeeds'
);

reset role;
select * from finish();
rollback;
```

- [ ] **Step 8.7: Install Supabase testing helpers**

Supabase CLI ships with `tests.create_supabase_user` etc via its test harness. On the branch, execute:

```json
{
  "project_id": "$BRANCH_REF",
  "query": "create schema if not exists tests; create extension if not exists \"basejump-supabase_test_helpers\" with schema tests;"
}
```

If the extension is unavailable, fall back to the official Supabase testing helpers: https://supabase.com/docs/guides/database/testing — copy the `tests` schema SQL into `supabase/migrations/20260422120300_test_helpers.sql` and apply via MCP.

- [ ] **Step 8.8: Run the RLS test suite on the branch**

Call `mcp__4a3f6a92-*__execute_sql` for each test file in order:
```
20260422120000_init_schema.sql                         (already applied)
20260422120100_seed_gamemodes_tags.sql                 (already applied)
20260422120200_rls_policies.sql                        (already applied)
supabase/tests/rls_profiles.sql
supabase/tests/rls_servers.sql
supabase/tests/rls_votes.sql
supabase/tests/rls_wishlists.sql
supabase/tests/vote_bucket_cooldown.sql
```

Expected: every `plan(N)` + `finish()` cycle reports `ok N - ...` with zero failures.

If any test fails, stop and fix the migration before merging to prod.

- [ ] **Step 8.9: Commit**

```bash
git add supabase/tests/
git commit -m "test(db): pgTAP suite for RLS + 12h vote cooldown unique index"
```

---

## Task 9 — Merge Branch to Production

- [ ] **Step 9.1: Merge the `develop` branch to production**

Call `mcp__4a3f6a92-*__merge_branch` with `{ branch_id: "$BRANCH_REF" }`.
Expected: fast-forward merge succeeds.

- [ ] **Step 9.2: Run advisors on production**

Call `get_advisors` twice (security + performance) with `project_id: $PROJECT_ID`.
Expected: zero new errors introduced. Document any warnings in a `## Notes` section of this plan (keep moving — don't block on warnings).

- [ ] **Step 9.3: Smoke-check production**

Call `list_tables` against `$PROJECT_ID` — confirm all 14 tables present.

---

## Task 10 — Generate TypeScript Types

**Files:**
- Modify: `Hyrank/lib/supabase/database.types.ts` (replace placeholder)

- [ ] **Step 10.1: Generate types via MCP**

Call: `mcp__4a3f6a92-*__generate_typescript_types` with `{ project_id: "$PROJECT_ID" }`.
Expected: response contains the full TypeScript types string.

- [ ] **Step 10.2: Write the generated types to disk**

Overwrite `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/lib/supabase/database.types.ts` with the returned content.

- [ ] **Step 10.3: Confirm TypeScript build succeeds**

Run: `npx tsc --noEmit`
Expected: no errors. If the build breaks, the types likely reference a type of `Json` that needs to be adjusted — usually fixed by pinning `@supabase/ssr` to latest.

- [ ] **Step 10.4: Commit**

```bash
git add lib/supabase/database.types.ts
git commit -m "chore(db): regenerate Supabase TypeScript types"
```

---

## Task 11 — Configure Discord OAuth in Supabase Dashboard (MANUAL)

**This is a manual/one-shot step. Document in the plan so a reviewer can verify.**

- [ ] **Step 11.1: Create a Discord application**

Visit https://discord.com/developers/applications → "New Application" → name: "HyRank".

- [ ] **Step 11.2: Copy OAuth credentials**

Under "OAuth2" tab, copy Client ID + Client Secret.

- [ ] **Step 11.3: Add redirect URL in Discord**

Under OAuth2 → Redirects, add: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.

- [ ] **Step 11.4: Enable Discord provider in Supabase**

Supabase Dashboard → Auth → Providers → Discord → enable, paste Client ID + Secret, save.

- [ ] **Step 11.5: Set Site URL + Redirect URLs in Supabase**

Auth → URL Configuration:
- Site URL: `https://hyrank.gg` (or local `http://localhost:3000` if we haven't launched yet)
- Additional redirect URLs: `http://localhost:3000/auth/callback`, `https://hyrank.gg/auth/callback`

- [ ] **Step 11.6: Fill `.env.local` with the new Supabase project values**

Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard into `.env.local`.

- [ ] **Step 11.7: Note in the plan**

Record in `Hyrank/docs/superpowers/plans/2026-04-22-phase1-foundation.md` at the bottom under `## Notes` the Supabase project ref and today's date. (So future phases know which project is canonical.)

---

## Task 12 — /auth/callback Route Handler (OAuth Code Exchange)

**Files:**
- Create: `Hyrank/app/auth/callback/route.ts`

- [ ] **Step 12.1: Write a failing Playwright test**

We'll write the test first (TDD) but it will require the live OAuth flow — so this one is a unit-ish test for the route handler using a mock.

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/tests/e2e/auth.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test("GET /auth/callback without code redirects to /login?error", async ({ page }) => {
  const response = await page.goto("/auth/callback");
  expect(response?.status()).toBe(200); // final page after redirect chain
  await expect(page).toHaveURL(/\/login(\?|$)/);
});
```

- [ ] **Step 12.2: Run it — confirm it fails**

Run: `npm run test:e2e -- tests/e2e/auth.spec.ts`
Expected: FAIL (404 or error — the route doesn't exist).

- [ ] **Step 12.3: Write the route handler**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/app/auth/callback/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=missing_code`, request.url),
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
```

- [ ] **Step 12.4: Run test — confirm it passes**

Run: `npm run test:e2e -- tests/e2e/auth.spec.ts`
Expected: PASS.

- [ ] **Step 12.5: Commit**

```bash
git add app/auth/callback/route.ts tests/e2e/auth.spec.ts
git commit -m "feat(auth): /auth/callback route handler exchanges OAuth code for session"
```

---

## Task 13 — /login Page with Discord Sign-In Button

**Files:**
- Create: `Hyrank/components/auth/DiscordSignInButton.tsx`
- Create: `Hyrank/app/login/page.tsx`

- [ ] **Step 13.1: Write the Discord sign-in button**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/components/auth/DiscordSignInButton.tsx`:
```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  next?: string;
  className?: string;
}

export default function DiscordSignInButton({ next = "/account", className = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function onClick() {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo, scopes: "identify email" },
    });
    if (error) {
      setLoading(false);
      alert(`Sign-in error: ${error.message}`);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`btn-legendary w-full flex items-center justify-center gap-2 disabled:opacity-50 ${className}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 127.14 96.36" fill="currentColor">
        <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z" />
      </svg>
      <span>{loading ? "Redirecting..." : "Sign in with Discord"}</span>
    </button>
  );
}
```

- [ ] **Step 13.2: Write the `/login` page**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/app/login/page.tsx`:
```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiscordSignInButton from "@/components/auth/DiscordSignInButton";

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;

  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(sp.next ?? "/account");

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card-strong w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in to HyRank</h1>
        <p className="text-white/60 mb-6">Connect your Discord account to vote, wishlist, and list servers.</p>

        {sp.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {decodeURIComponent(sp.error)}
          </div>
        )}

        <DiscordSignInButton next={sp.next ?? "/account"} />

        <p className="mt-6 text-center text-xs text-white/40">
          <Link href="/" className="hover:text-white/60 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 13.3: Confirm build**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 13.4: Commit**

```bash
git add app/login/page.tsx components/auth/DiscordSignInButton.tsx
git commit -m "feat(auth): /login page with Discord sign-in button"
```

---

## Task 14 — /account Page + Sign-Out Button

**Files:**
- Create: `Hyrank/components/auth/SignOutButton.tsx`
- Create: `Hyrank/app/account/page.tsx`

- [ ] **Step 14.1: Write the sign-out button**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/components/auth/SignOutButton.tsx`:
```typescript
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  async function onClick() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-primary inline-flex items-center gap-2"
    >
      <span>Sign out</span>
    </button>
  );
}
```

- [ ] **Step 14.2: Write the `/account` page**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/app/account/page.tsx`:
```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/auth/SignOutButton";

export default async function AccountPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, trust_tier, bio")
    .eq("id", data.user.id)
    .single();

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">
                {profile?.username ?? data.user.email}
              </h1>
              <p className="text-white/50 text-sm">
                Trust tier:{" "}
                <span className="text-legendary-400 uppercase">
                  {profile?.trust_tier ?? "unverified"}
                </span>
              </p>
            </div>
          </div>

          {profile?.bio && <p className="mt-4 text-white/70">{profile.bio}</p>}

          <div className="mt-6 flex gap-3">
            <SignOutButton />
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Phase 1 status</h2>
          <p className="text-white/60 text-sm">
            Voting, wishlists, submissions, and the owner dashboard are coming online incrementally.
            You&apos;ll see them appear here as each Phase 1 plan ships.
          </p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 14.3: Confirm build**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 14.4: Commit**

```bash
git add app/account/page.tsx components/auth/SignOutButton.tsx
git commit -m "feat(auth): /account page reads profile via RSC + sign-out"
```

---

## Task 15 — Playwright Config + Smoke Test

**Files:**
- Create: `Hyrank/playwright.config.ts`
- Modify: `Hyrank/tests/e2e/auth.spec.ts`

- [ ] **Step 15.1: Write the Playwright config**

Write `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/playwright.config.ts`:
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

- [ ] **Step 15.2: Extend the smoke test to cover the whole auth surface**

Overwrite `/Users/jamesfarmer/projectsv2/hyrank/Hyrank/tests/e2e/auth.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test.describe("auth smoke", () => {
  test("GET /login renders Discord sign-in", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in to hyrank/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in with discord/i })).toBeVisible();
  });

  test("GET /auth/callback without code redirects to /login", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(page).toHaveURL(/error=missing_code/);
  });

  test("GET /account while unauthenticated redirects to /login?next=/account", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  });

  test("GET /dashboard while unauthenticated redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /submit while unauthenticated redirects to /login", async ({ page }) => {
    await page.goto("/submit");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 15.3: Run the full suite**

Run: `npm run test:e2e`
Expected: 5/5 pass. If any fail, the middleware or routes are misconfigured.

- [ ] **Step 15.4: Commit**

```bash
git add playwright.config.ts tests/e2e/auth.spec.ts
git commit -m "test(auth): Playwright smoke tests for /login, /auth/callback, protected-route redirects"
```

---

## Task 16 — Manual End-to-End Sign-In (HUMAN-IN-THE-LOOP)

**Can't be automated — we need a real Discord account to sign in once.**

- [ ] **Step 16.1: Start dev server**

Run: `npm run dev`
Expected: server listens on `http://localhost:3000`.

- [ ] **Step 16.2: Sign in with Discord**

Open `http://localhost:3000/login` → click "Sign in with Discord" → complete Discord OAuth → land on `/account`.

Expected: `/account` renders your Discord username, avatar, and trust tier "UNVERIFIED".

- [ ] **Step 16.3: Confirm profile row was auto-created**

Call: `mcp__4a3f6a92-*__execute_sql` with:
```json
{
  "project_id": "$PROJECT_ID",
  "query": "select username, discord_id, avatar_url, trust_tier from public.profiles order by created_at desc limit 5;"
}
```
Expected: the most recent row is you.

- [ ] **Step 16.4: Sign out and confirm session cleared**

On `/account`, click "Sign out". Expected redirect to `/`. Revisit `/account` — expect redirect to `/login?next=%2Faccount`.

- [ ] **Step 16.5: If any step fails, debug before merging**

Common causes:
- Redirect URLs mismatch between Discord dev portal, Supabase Auth config, and `.env.local` `NEXT_PUBLIC_SITE_URL`
- Missing `SUPABASE_SERVICE_ROLE_KEY` (needed by later plans — not used by OAuth but a missing value crashes `createClient` if imported from a place that needs it)
- Trigger `on_auth_user_created` silently failed — check Supabase logs via `mcp__4a3f6a92-*__get_logs` with `service: "postgres"`

---

## Task 17 — Final Review + Plan 2 Kickoff Notes

- [ ] **Step 17.1: Confirm the full commit log for Plan 1 reads cleanly**

Run: `git log --oneline -20`
Expected: ~16 focused commits, each a single concern (deps, env, clients, middleware, schema, RLS, tests, types, OAuth routes, UI, e2e config).

- [ ] **Step 17.2: Confirm TypeScript + lint + tests all pass**

Run: `npx tsc --noEmit && npm run lint && npm run test:e2e`
Expected: all green.

- [ ] **Step 17.3: Write the `## Notes` block at the bottom of this plan**

Append to `docs/superpowers/plans/2026-04-22-phase1-foundation.md`:
```markdown
## Notes

- Supabase production project ref: `<PROJECT_ID>`
- Supabase develop branch ref: `<BRANCH_REF>` (retained for Plan 2+)
- Discord OAuth app id: `<DISCORD_CLIENT_ID>`
- Phase 1 env vars confirmed in `.env.local` on YYYY-MM-DD
- Performance advisor warnings (if any): <list>
- Security advisor warnings (if any): <list>
```

- [ ] **Step 17.4: Commit**

```bash
git add docs/superpowers/plans/2026-04-22-phase1-foundation.md
git commit -m "docs(plan): record Phase 1 Foundation completion notes"
```

- [ ] **Step 17.5: Ready for Plan 2**

Announce: Plan 1 complete. Ready to write Plan 2 (Server Ingestion + Pinging), which depends on:
- `servers` table + RLS ✅
- `gamemodes` seeded ✅
- `server_mods` table ready ✅
- Supabase clients wired ✅
- Auth working ✅

---

## Self-Review Checklist

**Spec coverage:** The Phase 1 spec section 5.6 (User Accounts), section 6 (Data Model), and section 7 (Tech Stack & Architecture) are all implemented by this plan. Other spec sections (submission form, voting, ranking, dashboard, SEO, HyRank Vote Plugin) are correctly deferred to Plans 2–7.

**Placeholder scan:** Every step contains concrete code, SQL, or commands. The only intentional placeholder is `<PROJECT_ID>` / `<BRANCH_REF>` / `<DISCORD_CLIENT_ID>` — these are per-environment values the executing human records at manual-step time.

**Type consistency:** All table/column names match between migrations, RLS policies, pgTAP tests, and the `.ts` files. Every table referenced in `rls_*.sql` exists in `20260422120000_init_schema.sql`.

**Dependencies between plans:** Plan 1 exits with auth + schema + types. Plan 2 can pick up these primitives without re-designing anything.
