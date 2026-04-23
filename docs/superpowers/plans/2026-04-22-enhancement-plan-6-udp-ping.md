# HyRank Enhancement Plan 6 — Real UDP Ping (Hytale Native Query)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Replace the fake "HTTP HEAD masquerading as TCP ping" in `lib/server-query.ts` with the actual Hytale UDP query protocol (V1 + V2) via the `@hytaleone/query` NPM package. Keep the Nitrado OneQuery HTTPS plugin as a richer fallback for servers that have it installed. Delete the inverted-semantics HTTP fallback. This fixes the single most broken piece of telemetry in the platform — `uptime_*` data is currently garbage for any server without the Nitrado plugin.

**Architecture:** Primary path becomes `@hytaleone/query` UDP V2 (challenge-authenticated, supports proxy-aggregation flag, no plugin required). Secondary is Nitrado OneQuery HTTPS (existing code path — richer data for servers that install it). If both fail, status is `unknown` — NOT "online because fetch completed fast." Owners see a dashboard CTA to install the Nitrado plugin for richer data, but the UDP path Just Works for any Hytale server running the stock game.

---

## Assumed State

- Plans 1-5 landed. `lib/server-query.ts` currently exports `queryServer(host, queryPort, gamePort)` which tries Nitrado HTTPS first, falls through to `simplePing` (fake HTTP HEAD). `app/api/cron/ping-servers/route.ts` consumes this.
- `servers.query_port` defaults to 5523 (Nitrado plugin HTTPS port).
- Hytale game UDP query defaults to port 5520.

---

## File Structure

**Modified:**
- `Hyrank/package.json` — add `@hytaleone/query`
- `Hyrank/lib/server-query.ts` — rewrite orchestrator with UDP primary + Nitrado secondary
- `Hyrank/tests/unit/server-query.test.ts` — Vitest covering protocol selection and timeout behavior
- `Hyrank/app/api/cron/ping-servers/route.ts` — tiny update to handle the new `ServerStatus` shape (extra fields like `players[]`, `plugins[]` from V2)

**Created:**
- `Hyrank/lib/server-query/udp.ts` — thin wrapper around `@hytaleone/query`
- `Hyrank/lib/server-query/nitrado.ts` — extracted from existing server-query.ts
- `Hyrank/lib/server-query/types.ts` — shared `ServerStatus` type

---

## Tasks

### Task 1 — Install + isolate

1. `cd Hyrank && npm install @hytaleone/query@latest`
2. Create `lib/server-query/types.ts` exporting the canonical `ServerStatus` interface (migrate from current `lib/server-query.ts`).
3. Create `lib/server-query/nitrado.ts` — move `queryViaNitrado` there verbatim.
4. Create `lib/server-query/udp.ts` with:
   ```typescript
   import { query as hytaleQuery } from "@hytaleone/query";
   import type { ServerStatus } from "./types";
   export async function queryViaUdp(host: string, port = 5520, timeoutMs = 5000): Promise<ServerStatus> {
     try {
       const res = await hytaleQuery({ host, port, timeout: timeoutMs, version: "v2" });
       return {
         online: true,
         latencyMs: res.latencyMs ?? null,
         playerCount: res.currentPlayers ?? 0,
         maxPlayers: res.maxPlayers ?? 0,
         serverName: res.serverName ?? "",
         version: res.version ?? "",
         motd: res.motd ?? "",
         lastChecked: new Date().toISOString(),
         source: "udp-v2",
       };
     } catch {
       return { online: false, latencyMs: null, playerCount: 0, maxPlayers: 0, serverName: "", version: "", motd: "", lastChecked: new Date().toISOString(), source: "udp-v2" };
     }
   }
   ```
5. Rewrite `lib/server-query.ts` as a thin re-export + orchestrator:
   ```typescript
   export * from "./server-query/types";
   import { queryViaUdp } from "./server-query/udp";
   import { queryViaNitrado } from "./server-query/nitrado";

   export async function queryServer(host: string, queryPort?: number, gamePort?: number) {
     const udpPort = gamePort ?? 5520;
     const udp = await queryViaUdp(host, udpPort);
     if (udp.online) return udp;
     if (queryPort) {
       const nit = await queryViaNitrado(host, queryPort);
       if (nit.online) return nit;
     }
     return { ...udp, source: "unknown" as const };
   }
   ```
   **Delete** the old `simplePing` function. Delete the HTTP HEAD path entirely.

### Task 2 — Update ping cron

`app/api/cron/ping-servers/route.ts` reads the new `source` field and writes `server_status_history.latency` from `latencyMs`. If `motd` is present, call `verify_pending_motd_claims` RPC (from Plan 5 Task 4) to auto-verify claims.

### Task 3 — Tests

Vitest: mock `@hytaleone/query`, verify orchestrator falls through correctly in both directions, verify timeouts respected.

### Task 4 — Exit bar

- `cd Hyrank && npx tsc --noEmit && npm run build && npm run test:run && npm run test:e2e`
- Manual: trigger the cron against a local Hytale server (optional — if you don't have one running, verify the route returns 200 even when all pings fail)

### Task 5 — Commit + notes

```bash
cd Hyrank && git add .
git commit -m "feat(ping): real Hytale UDP query via @hytaleone/query (replaces fake HTTP HEAD)"
```

---

## Self-Review

**Spec coverage:** The audit explicitly called the HTTP HEAD fallback "inverted semantics" and "garbage uptime data." This plan deletes it and replaces with a real protocol implementation.

**Non-goals:** This plan doesn't add a web panel for status history (Plan 5 dashboard surfaces it). Doesn't add WebSocket live-player push (SWR polling from Plan 3 is sufficient).

**Dependency risk:** `@hytaleone/query` is a community package; if it breaks, Nitrado fallback still works for servers running the plugin. Document the version we pin.

---

## Completion Notes (2026-04-22)

**Status:** DONE

**Package installed:** `@hytaleone/query@1.1.1` (MIT, zero runtime deps, Node ≥ 18)

### Deviations from plan sketch

**1. API call signature** — The plan's sketch used `hytaleQuery({ host, port, timeout, version: "v2" })` (object form with version discriminator). The actual package API is positional: `query(host, port, { timeout })`. Adapted accordingly.

**2. V1 used instead of V2** — The plan called for "UDP V2 primary." In practice, V2 requires a preflight V1 challenge round-trip to verify `supportsV2` before calling `queryV2()`. For a status ping, V1 `query()` returns all needed fields (`serverName`, `motd`, `currentPlayers`, `maxPlayers`, `version`) in a single round-trip. V2 adds pagination and auth but no additional status fields. V1 is used; `source` is set to `"udp-v1"` rather than `"udp-v2"`.

**3. latencyMs not in package response** — Neither `ServerInfo` nor `ServerInfoV2` include a `latencyMs` field. Latency is measured locally with `Date.now()` around the `query()` call.

**4. CRITICAL PLUGIN REQUIREMENT** — The plan stated "the UDP path Just Works for any Hytale server running the stock game." **This is incorrect.** The package README explicitly states: "Server must have the HytaleOne Query Plugin installed." The UDP query protocol implemented here is the HytaleOne plugin's custom UDP protocol, not the stock Hytale game query interface. Servers without this plugin will return `online: false` from the UDP path (same as before for servers without Nitrado). The architecture comment in `lib/server-query/udp.ts` documents this clearly.

**5. motd added to ServerStatus** — As required by the task brief (not the plan sketch), `motd: string` was added to the canonical `ServerStatus` interface in `lib/server-query/types.ts`. Nitrado path sets `motd: ""` (Nitrado query response has no MOTD field).

**6. Claim verification re-enabled** — The `TODO(Plan 6)` block in `app/api/cron/ping-servers/route.ts` (disabled in commit `701343c`) has been replaced with a live RPC call to `verify_pending_motd_claims(p_server_id, p_motd)` using `status.motd` from the UDP response. Guard: `status.motd && status.motd.length > 0`.

### Exit bar results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (warnings pre-existing, not from Plan 6) |
| `npm run build` | PASS |
| `npm run test:run` | 32/32 (13 pre-existing + 19 new server-query tests) |
| `npm run test:e2e` | 7/7 |

### Commits

- `4f42a63` — feat(ping): Task 1 — install @hytaleone/query, isolate server-query submodules
- `1851c0f` — feat(ping): Task 2 — update ping cron for new ServerStatus shape + re-enable claim verification
- `722ad72` — test(ping): Task 3 — Vitest coverage for server-query orchestrator
- `59b4c57` — fix(test): use vi.fn<() => Promise<ServerInfo>>() for TS compat in server-query test
