# HyRank Vote Plugin — Configuration Reference

Config file location: `mods/HyRank/config.json` (relative to server working directory).

## Full Schema

```json
{
  "apiKey":               "string  — Your HyRank API key (from dashboard)",
  "serverId":             "string  — Your HyRank server ID",
  "hmacSecret":           "string  — HMAC signing secret (from dashboard)",
  "replayWindowSeconds":  300,
  "webhook": {
    "enabled":   true,
    "bindPort":  5523,
    "path":      "/hyrank/vote"
  },
  "votifierV2": {
    "enabled":   false,
    "bindPort":  8192,
    "token":     "string — HMAC token for Votifier V2 sites"
  },
  "rewards": [
    {
      "trigger":         "vote",
      "commands":        ["give {player} diamond 1", "broadcast {player} voted!"],
      "cooldownSeconds": 86400
    }
  ]
}
```

## Field Reference

### Top-level

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `apiKey` | string | `""` | HyRank API key. Find it in Dashboard → Settings. |
| `serverId` | string | `""` | Your server's HyRank ID. |
| `hmacSecret` | string | `""` | HMAC-SHA256 signing secret. Must match the dashboard secret. |
| `replayWindowSeconds` | int | `300` | Maximum age (seconds) of an accepted webhook timestamp. |

### `webhook`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | bool | `true` | Enable the native HyRank webhook receiver. |
| `bindPort` | int | `5523` | Port to listen on. Must be reachable from HyRank servers. |
| `path` | string | `"/hyrank/vote"` | URL path for the POST endpoint. |

### `votifierV2`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | bool | `false` | Enable the Votifier V2 TCP listener. |
| `bindPort` | int | `8192` | Port for Votifier V2 connections. |
| `token` | string | `""` | HMAC token shared with Votifier V2 listing sites. |

### `rewards[*]`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `trigger` | string | `"vote"` | Event name that activates this reward. |
| `commands` | string[] | `[]` | Server commands to execute. Use `{player}` as the voter's name. |
| `cooldownSeconds` | int | `86400` | Minimum seconds between rewards for the same player. |

## Multiple Reward Rules

You can define multiple rules with different triggers:

```json
"rewards": [
  {
    "trigger":  "vote",
    "commands": ["give {player} diamond 5"],
    "cooldownSeconds": 86400
  },
  {
    "trigger":  "vote_streak_7",
    "commands": ["give {player} netherite_ingot 1", "broadcast {player} has a 7-day streak!"],
    "cooldownSeconds": 0
  }
]
```
