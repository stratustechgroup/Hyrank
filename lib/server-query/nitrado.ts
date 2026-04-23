/**
 * Nitrado OneQuery HTTPS path.
 * Requires the OneQuery plugin installed on the Hytale server.
 * Richer data (plugin list, world info) but requires plugin installation.
 */

import type { ServerStatus } from "./types";

interface NitradoQueryResponse {
  server?: {
    name?: string;
    version?: string;
    protocol?: string;
    maxPlayers?: number;
    revision?: string;
    patchline?: string;
  };
  universe?: {
    playerCount?: number;
    defaultWorld?: string;
  };
  players?: Array<{
    name: string;
    uuid: string;
    world: string;
  }>;
  plugins?: Array<{
    name: string;
    version: string;
    loaded: boolean;
    enabled: boolean;
  }>;
}

export async function queryViaNitrado(
  host: string,
  port = 5523
): Promise<ServerStatus> {
  const startTime = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://${host}:${port}/Nitrado/Query`, {
      headers: {
        Accept: "application/x.hytale.nitrado.query+json;version=1",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: NitradoQueryResponse = await response.json();
    const latencyMs = Date.now() - startTime;

    return {
      online: true,
      latencyMs,
      playerCount: data.universe?.playerCount ?? 0,
      maxPlayers: data.server?.maxPlayers ?? 0,
      serverName: data.server?.name ?? "Unknown",
      version: data.server?.version ?? "Unknown",
      // Nitrado query does not expose a MOTD field
      motd: "",
      lastChecked,
      source: "nitrado",
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
      source: "nitrado",
    };
  }
}
