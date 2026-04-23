# HyRank Vote Plugin

The official Hytale server plugin for [HyRank.gg](https://hyrank.gg) vote integration.

Receives HMAC-signed webhook `POST /hyrank/vote` calls from HyRank on every valid vote, dispatches configurable in-game rewards, persists rewards for offline players, and optionally provides a Votifier V2 TCP listener for compatibility with other listing sites.

## Requirements

- JDK 17+
- Hytale dedicated server (Britakee-based or compatible plugin runtime)

## Install

1. Download `hyrank-vote-plugin-0.1.0.jar` from [Releases](https://github.com/hyrank/hyrank-vote-plugin/releases) or [CurseForge](https://curseforge.com/hytale/plugins/hyrank-vote-plugin).
2. Drop the JAR into your server's `plugins/` (or `mods/`) directory.
3. Restart the server — `mods/HyRank/config.json` is created on first run with defaults.
4. Copy your HMAC secret + API key from the [HyRank Dashboard](https://hyrank.gg/dashboard) into `config.json`.
5. Restart again to apply your keys.

## Configuration

See [`docs/config.md`](docs/config.md) for full config reference and [`docs/security.md`](docs/security.md) for HMAC verification details.

## Quick Start

```json
{
  "apiKey": "YOUR_API_KEY",
  "serverId": "YOUR_SERVER_ID",
  "hmacSecret": "YOUR_HMAC_SECRET",
  "replayWindowSeconds": 300,
  "webhook": {
    "enabled": true,
    "bindPort": 5523,
    "path": "/hyrank/vote"
  },
  "votifierV2": {
    "enabled": false,
    "bindPort": 8192,
    "token": ""
  },
  "rewards": [
    {
      "trigger": "vote",
      "commands": ["give {player} diamond 1", "broadcast {player} voted on HyRank!"],
      "cooldownSeconds": 86400
    }
  ]
}
```

## Building from Source

Requires Gradle 8+ installed (or use the wrapper once bootstrapped):

```bash
gradle wrapper          # generates gradlew (first time only)
./gradlew clean build   # builds plugin/build/libs/hyrank-vote-plugin-0.1.0.jar
./gradlew test          # runs JUnit 5 test suite
```

## License

MIT — see [LICENSE](LICENSE).
