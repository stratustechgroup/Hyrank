# HyRank Vote Plugin — Security Model

## Threat Model

The webhook endpoint (`POST /hyrank/vote`) is exposed to the internet on port 5523.
Anyone who can reach the port could attempt to:
1. Forge a vote to claim rewards for free
2. Replay a legitimate vote multiple times
3. Flood the endpoint (DoS)

The plugin defends against all three.

## HMAC-SHA256 Verification

Every request from HyRank carries two headers:

| Header | Value |
|--------|-------|
| `X-HyRank-Timestamp` | Unix epoch seconds when HyRank generated the request |
| `X-HyRank-Signature` | `hex(HMAC-SHA256(hmacSecret, timestamp + "." + rawBody))` |

The plugin:
1. Reads `hmacSecret` from `config.json`
2. Constructs `signed_payload = timestamp + "." + rawBody`
3. Computes `expected = HMAC-SHA256(secret, signed_payload)`
4. Compares `expected` vs `X-HyRank-Signature` using **constant-time comparison** (`MessageDigest.isEqual`) — preventing timing oracle attacks
5. Rejects if they differ

This mirrors Stripe's webhook verification pattern.

## Replay Window

The timestamp in `X-HyRank-Timestamp` is checked against the server's current clock.
Requests where `|now - timestamp| > replayWindowSeconds` (default 300 s = 5 minutes) are rejected.

If your server's clock drifts more than 5 minutes from UTC, synchronise it with NTP.

## Nonce Deduplication

Each HyRank webhook request includes a unique `nonce` field in the JSON body.
The plugin caches seen nonces in a bounded LRU map with a 24-hour TTL.

Any request that reuses a nonce within 24 hours is rejected with HTTP 409, even if the HMAC is valid.
This prevents replay attacks that occur within the replay window.

## Secrets Management

- `hmacSecret` is stored server-side in `mods/HyRank/config.json`
- It is never logged or transmitted back to HyRank
- It is never sent to players
- The HyRank dashboard can rotate the secret at any time; update `config.json` and restart

## Votifier V2 Security

When Votifier V2 is enabled, the plugin issues a random challenge nonce to each connecting client.
The client must prove knowledge of `token` by sending `HMAC-SHA256(token, challenge)`.
There is no RSA key material to manage.

## What Is NOT Protected

- **DoS:** The plugin does not rate-limit inbound connections. If you are concerned about flood attacks, put the webhook receiver behind a reverse proxy (nginx, Cloudflare Tunnel) that can apply rate limiting.
- **Plugin-to-plugin trust:** Other plugins running on the same JVM have access to the same `config.json`. Guard your server's plugin installation.
