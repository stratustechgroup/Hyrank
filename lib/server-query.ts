/**
 * Hytale Server Query Utilities
 *
 * Query strategy (priority order):
 * 1. UDP V1 via @hytaleone/query (primary) — works for servers with HytaleOne
 *    Query Plugin; returns MOTD, player count, version.
 * 2. Nitrado OneQuery HTTPS (secondary) — richer data for servers that have the
 *    Nitrado plugin installed (port 5523).
 * 3. Both fail → status is `unknown`, not "online." The old HTTP HEAD fallback
 *    with inverted semantics has been removed.
 */

export type { ServerStatus, QuerySource } from "./server-query/types";

import { queryViaUdp } from "./server-query/udp";
import { queryViaNitrado } from "./server-query/nitrado";
import type { ServerStatus } from "./server-query/types";

export { queryViaUdp, queryViaNitrado };

export async function queryServer(
  host: string,
  queryPort?: number,
  gamePort?: number
): Promise<ServerStatus> {
  const udpPort = gamePort ?? 5520;

  // Primary: UDP query (requires HytaleOne Query Plugin)
  const udp = await queryViaUdp(host, udpPort);
  if (udp.online) return udp;

  // Secondary: Nitrado OneQuery HTTPS (requires Nitrado plugin)
  if (queryPort) {
    const nit = await queryViaNitrado(host, queryPort);
    if (nit.online) return nit;
  }

  // Both failed — server is genuinely unreachable
  return { ...udp, source: "unknown" as const };
}

/**
 * Parse a server address into host and port.
 */
export function parseServerAddress(address: string): {
  host: string;
  port: number;
} {
  const parts = address.split(":");
  const host = parts[0];
  const port = parts[1] ? parseInt(parts[1], 10) : 25565;
  return { host, port };
}

/**
 * Calculate uptime percentage from status history.
 */
export function calculateUptime(
  statusHistory: Array<{ status: string; recorded_at: string }>,
  hoursBack: number
): number | null {
  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const relevantHistory = statusHistory.filter(
    (h) => new Date(h.recorded_at) >= cutoffTime
  );

  if (relevantHistory.length === 0) {
    return null;
  }

  const onlineCount = relevantHistory.filter(
    (h) => h.status === "online"
  ).length;
  return Math.round(((onlineCount / relevantHistory.length) * 100) * 100) / 100;
}
