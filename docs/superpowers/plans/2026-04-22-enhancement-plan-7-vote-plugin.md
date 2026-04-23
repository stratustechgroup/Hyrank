# HyRank Enhancement Plan 7 — HyRank Vote Plugin (Java/Gradle Subproject)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Ship the HyRank Vote Plugin — a Java/Gradle Hytale server plugin that receives HMAC-signed webhook POSTs from HyRank on every valid vote, dispenses the owner-configured reward in-game, and optionally exposes a Votifier V2 TCP listener for compatibility with other listing sites. Publish to CurseForge + GitHub.

**Why this matters:** Research agent confirmed NO Votifier equivalent exists for Hytale yet. First-mover ships the canonical integration layer — every future listing site either integrates with our plugin or writes their own. This is the same leverage NuVotifier holds in the Minecraft listing ecosystem.

**Architecture:** Separate Gradle subproject under `plugin/` (NOT `Hyrank/`). Java 17+ (per Hytale server plugin runtime requirements). Main class `gg.hyrank.vote.HyRankPlugin` registers two components: (1) an embedded HTTP server (Jakarta Servlet, same pattern as `nitrado/hytale-plugin-webserver`) listening on `game_port + 3` (default 5523) for `POST /hyrank/vote`, (2) optionally a TCP listener on port 8192 for Votifier V2 RSA-encrypted payloads. Config lives in `mods/HyRank/config.json`. HMAC verification uses SHA-256 over `timestamp.rawBody` (Stripe pattern), 300-second replay window, 24h nonce LRU dedup.

---

## Scope

**This plan:** Java plugin MVP + CurseForge publish.
**Not this plan:** Proof-of-play ed25519 signing (Phase 2 — when enough servers have the plugin installed to make PoP meaningful).

---

## Prerequisites

- JDK 17 installed (`java -version` → 17+)
- Gradle 8+ (or use the Gradle wrapper that we ship)
- CurseForge developer account for publishing
- GitHub repo `hyrank/hyrank-vote-plugin` created (public)

---

## File Structure (new Gradle subproject under `plugin/`)

```
/Users/jamesfarmer/projectsv2/hyrank/plugin/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradle/wrapper/  (standard)
├── gradlew / gradlew.bat
├── README.md
├── LICENSE  (MIT)
├── plugin.json      (Hytale plugin manifest)
├── src/
│   ├── main/
│   │   ├── java/gg/hyrank/vote/
│   │   │   ├── HyRankPlugin.java            (entry point)
│   │   │   ├── Config.java                   (JSON config loader)
│   │   │   ├── WebhookServer.java            (Jakarta HTTP receiver)
│   │   │   ├── HmacVerifier.java             (SHA-256 timestamp.rawBody verify + replay window)
│   │   │   ├── NonceCache.java               (24h LRU)
│   │   │   ├── RewardDispatcher.java         (runs configured commands on main thread)
│   │   │   ├── PendingRewards.java           (disk-backed queue for offline players)
│   │   │   ├── RedeemCommand.java            (/redeem <code> handler — fallback path)
│   │   │   └── VotifierListener.java         (V2 TCP + RSA — optional)
│   │   └── resources/
│   │       ├── config.default.json
│   │       └── plugin-info.json
│   └── test/
│       └── java/gg/hyrank/vote/  (JUnit 5 tests)
└── docs/
    ├── install.md
    ├── config.md
    └── security.md
```

---

## Tasks

### Task 1 — Gradle project skeleton

1. `cd /Users/jamesfarmer/projectsv2/hyrank && mkdir -p plugin/src/main/java/gg/hyrank/vote plugin/src/main/resources plugin/src/test/java/gg/hyrank/vote plugin/docs`
2. `gradle init --type java-library --test-framework junit-jupiter --dsl kotlin --project-name hyrank-vote-plugin --package gg.hyrank.vote` (or hand-write `build.gradle.kts`).
3. Dependencies: `jakarta.servlet-api`, `jackson-databind`, `bcprov-jdk18on` (for Votifier V2 RSA), `junit-jupiter`.
4. Write `README.md` describing install steps.

### Task 2 — Core classes

Implement each class. All code in `src/main/java/gg/hyrank/vote/`. Keep individual files under 200 lines.

- **`HyRankPlugin.java`** — entry point. Reads config, starts WebhookServer, optionally starts VotifierListener, registers `/redeem` command handler. Implements the Hytale plugin lifecycle interface (exact interface TBD per Britakee GitBook docs).
- **`Config.java`** — Jackson-backed POJO loader from `mods/HyRank/config.json`. Fields: `apiKey`, `serverId`, `webhook: {enabled, bindPort, path}`, `votifierV2: {enabled, bindPort, token}`, `rewards: [{trigger, commands[], cooldownSeconds}]`, `hmacSecret`, `replayWindowSeconds`.
- **`HmacVerifier.java`** — constant-time SHA-256 compare over `timestamp.rawBody`. 300s window. Rejects expired.
- **`NonceCache.java`** — Bounded ConcurrentLinkedHashMap, 24h TTL. Thread-safe.
- **`WebhookServer.java`** — Jakarta Servlet bound to `bindPort`. Handler validates HMAC, checks nonce, queues reward. Always responds `204` immediately — actual reward dispatch is async.
- **`RewardDispatcher.java`** — takes a reward config + player context, schedules reward commands on the main server thread (Hytale plugin API requirement). For offline players, delegates to `PendingRewards`.
- **`PendingRewards.java`** — `pending_rewards.json` on disk. On player-join event, applies pending rewards.
- **`RedeemCommand.java`** — `/redeem <code>` command handler. Makes an outbound HTTPS call to `https://hyrank.gg/api/redeem` to validate the code, then invokes RewardDispatcher.
- **`VotifierListener.java`** — V2 TCP listener, HMAC-auth variant (no RSA required, simpler than V1). Decodes incoming payloads, maps to `RewardDispatcher`.

### Task 3 — JUnit tests

Cover at minimum:
- `HmacVerifier`: valid signature passes, expired timestamp rejected, tampered body rejected, constant-time comparison.
- `NonceCache`: duplicate nonce rejected within 24h window, new nonce accepted.
- `Config`: parses example config, rejects invalid JSON.

Target: 6-10 tests, fast (<1s total).

### Task 4 — Build

`cd plugin && ./gradlew clean build` — produces `build/libs/hyrank-vote-plugin-0.1.0.jar`.

### Task 5 — GitHub publish

1. Create repo `hyrank/hyrank-vote-plugin` on GitHub (public).
2. Add GitHub Action that builds + uploads the JAR artifact on every tag.
3. Push initial commit with README documenting install steps.

### Task 6 — CurseForge publish

1. Register project on hytale.curseforge.com.
2. Upload `0.1.0` JAR.
3. Write project description pointing to GitHub + HyRank dashboard.
4. Tag categories: Plugins → Voting/Server Admin.

### Task 7 — HyRank website integration

Add a `/dashboard/[serverSlug]/webhook` settings page that:
1. Generates an API key for the server (stored in `servers.votifier_secret_key` — that column exists).
2. Generates a downloadable `config.json` preloaded with apiKey + serverId + HMAC secret.
3. Shows step-by-step install instructions.

This is Next.js work; lives in `Hyrank/`, not `plugin/`.

### Task 8 — End-to-end smoke

With a test Hytale server running the plugin:
1. Register the server on HyRank.
2. Copy the generated config into `mods/HyRank/config.json`.
3. Restart Hytale server.
4. Cast a vote from HyRank.
5. Verify reward is dispatched in-game.

---

## Self-Review

**Spec coverage:** All prep-research-agent findings addressed: Votifier V2 compatibility ✓, native HyRank webhook ✓, HMAC-SHA256 + replay + nonce ✓, offline player handling ✓, `/redeem` fallback ✓, CurseForge publish ✓.

**Risk:** Hytale plugin API is still young; the exact lifecycle interface (`HyRankPlugin implements HytalePlugin`) may differ from the Britakee example. Plan step 1 starts with Kaupenjoe/sammwyy template clones to get the scaffolding right.

**Non-goals:** Proof-of-play ed25519 signing → Phase 2 after adoption proves out. Multi-server-license model → Phase 3. Paid "Pro" plugin features → Phase 4.

**Parallelizable:** The Java plugin builds entirely separately from the Next.js app. Plan 7 Task 7 (HyRank settings page) depends on Plans 1-5 landing; the plugin build itself (Tasks 1-6) has no Next.js dependencies and could be developed by a Java-only implementer in parallel.

---

## Completion Notes (2026-04-23)

**Status: DONE_WITH_CONCERNS**

### What was completed

- Task 1 (Gradle skeleton): hand-written `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`, `gradle/wrapper/gradle-wrapper.properties`, `gradlew` placeholder, `plugin.json`, `LICENSE`, `README.md`. All files at `Hyrank/plugin/` inside the git repo.
- Task 2 (Core classes): All 9 classes implemented at `plugin/src/main/java/gg/hyrank/vote/`: `HmacVerifier`, `NonceCache`, `Config`, `WebhookServer`, `RewardDispatcher`, `PendingRewards`, `RedeemCommand`, `VotifierListener`, `HyRankPlugin`. Plus `HytalePlugin` stub interface (10th file). All under 200 lines.
- Task 3 (JUnit tests): 3 test classes, 20 tests covering `HmacVerifier`, `NonceCache`, and `Config`.
- Task 4 (Build): DEFERRED — Gradle not installed on this machine. Build config is complete. User must run `brew install gradle && cd Hyrank/plugin && gradle wrapper && ./gradlew clean build` to produce the JAR and verify tests.
- Task 5 (GitHub Actions): `.github/workflows/release.yml` written — builds JAR + creates GitHub Release on version tags. Manual step: user must create the `hyrank/hyrank-vote-plugin` GitHub repo and push.
- Task 6 (CurseForge): `plugin/docs/release.md` documents the manual CurseForge publish checklist.
- Task 7 (Next.js settings page): `app/dashboard/[serverSlug]/webhook/page.tsx` created. Uses `servers.votifier_secret_key` (column confirmed to exist). Generates HMAC secret on first load, shows downloadable pre-filled `config.json`, Rotate Secret server action. `tsc --noEmit` passes.
- Task 8 (Smoke test): Manual — requires a running Hytale server. Deferred to user.

### Concerns

1. **Gradle not bootstrapped.** The `gradlew` script in `plugin/` is a placeholder. The user must install Gradle 8+ and run `gradle wrapper` before `./gradlew build` will work. CI (`release.yml`) handles this automatically on GitHub Actions.
2. **Hytale plugin API is TBD.** `HyRankPlugin.java` and `HytalePlugin.java` use a minimal stub lifecycle interface. All Hytale-API-dependent wiring (command registration, player-join events, servlet registration) is marked with `// TODO` comments. These will need updating once the official SDK ships.
3. **WebhookServer requires an embedded HTTP container.** The Hytale plugin runtime must provide one. The `WebhookServer` is a standard `HttpServlet` — binding it to a port is deferred to the SDK wiring.
4. **Task 7 `apiKey` field.** The dashboard page instructs users to manually add their `apiKey` to the downloaded config. The dashboard does not expose a raw API key creation flow — that is a separate Auth/API-key feature (future plan).
