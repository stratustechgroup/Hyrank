/**
 * UDP query path via @hytaleone/query (V1 protocol).
 *
 * NOTE: @hytaleone/query requires the HytaleOne Query Plugin installed on the
 * server. The package does NOT query the stock Hytale server binary directly.
 * V1 is used here because it returns all fields needed (serverName, motd,
 * currentPlayers, maxPlayers, version) in a single round-trip. V2 would
 * require a preflight challenge fetch and offers no additional status data.
 */

import { query } from "@hytaleone/query";
import type { ServerStatus } from "./types";

export async function queryViaUdp(
  host: string,
  port = 5520,
  timeoutMs = 5000
): Promise<ServerStatus> {
  const lastChecked = new Date().toISOString();
  const t0 = Date.now();

  try {
    const res = await query(host, port, { timeout: timeoutMs });
    const latencyMs = Date.now() - t0;

    return {
      online: true,
      latencyMs,
      playerCount: res.currentPlayers ?? 0,
      maxPlayers: res.maxPlayers ?? 0,
      serverName: res.serverName ?? "",
      version: res.version ?? "",
      motd: res.motd ?? "",
      lastChecked,
      source: "udp-v1",
    };
  } catch {
    return {
      online: false,
      latencyMs: null,
      playerCount: 0,
      maxPlayers: 0,
      serverName: "",
      version: "",
      motd: "",
      lastChecked,
      source: "udp-v1",
    };
  }
}
