/**
 * Shared types for server query modules.
 */

export type QuerySource = "udp-v1" | "nitrado" | "unknown";

export interface ServerStatus {
  online: boolean;
  /** Round-trip latency in milliseconds, or null when offline */
  latencyMs: number | null;
  playerCount: number;
  maxPlayers: number;
  serverName: string;
  version: string;
  /** Live MOTD from the UDP query response */
  motd: string;
  lastChecked: string;
  source: QuerySource;
}
