# HyRank Vote Plugin — Installation Guide

## Requirements

- Hytale dedicated server with plugin support
- JDK 17 or newer (on the server host)
- Port open for the webhook receiver (default: **5523**)
- Optional: Port open for Votifier V2 (default: **8192**)

## Step-by-Step Install

### 1. Download the JAR

- **CurseForge:** Search for "HyRank Vote Plugin" → [Download latest](https://curseforge.com/hytale/plugins/hyrank-vote-plugin)
- **GitHub Releases:** [github.com/hyrank/hyrank-vote-plugin/releases](https://github.com/hyrank/hyrank-vote-plugin/releases)
- **HyRank Dashboard:** Settings → Vote Plugin → Download config + JAR

### 2. Install

Drop `hyrank-vote-plugin-0.1.0.jar` into your server's `plugins/` directory (exact path depends on your Hytale server distribution).

### 3. First Start

Start (or restart) the server. The plugin writes a default config at:

```
mods/HyRank/config.json
```

### 4. Configure

Open `mods/HyRank/config.json` and fill in your credentials from the [HyRank Dashboard](https://hyrank.gg/dashboard/settings/vote-plugin):

```json
{
  "apiKey":      "YOUR_API_KEY",
  "serverId":    "YOUR_SERVER_ID",
  "hmacSecret":  "YOUR_HMAC_SECRET",
  ...
}
```

The easiest way is to use **Dashboard → Download Config** — it generates a pre-filled `config.json` you can drop directly into `mods/HyRank/`.

### 5. Restart

Restart the server again to apply your credentials.

### 6. Verify

Cast a test vote from [hyrank.gg](https://hyrank.gg) and confirm the reward arrives in-game.

---

## Firewall / Port Forwarding

The webhook receiver listens on `bindPort` (default **5523**). HyRank's servers
send `POST https://<your-server-ip>:5523/hyrank/vote` on each vote.

Make sure your firewall allows inbound TCP on port 5523 from HyRank's IP ranges
(check the dashboard for the current allowlist).

If you are behind NAT, forward port 5523 to your server host.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| No reward after vote | `hmacSecret` not set, or port 5523 not reachable |
| "Signature mismatch" in logs | `hmacSecret` doesn't match the one in your dashboard |
| "Timestamp outside replay window" | Server clock is more than 5 minutes off — sync NTP |
| Player didn't receive reward in-game | They may have been offline — run `/redeem <code>` |

See [security.md](security.md) for full HMAC details and [config.md](config.md) for all config options.
