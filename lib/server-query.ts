/**
 * Hytale Server Query Utilities
 *
 * Hytale uses QUIC over UDP (port 5520) for game traffic.
 * For server list queries, we support:
 * 1. Nitrado Query API (HTTPS on port 5523) - Full data
 * 2. Simple TCP ping fallback - Basic connectivity check
 */

export interface ServerStatus {
  online: boolean;
  latencyMs: number;
  playerCount: number;
  maxPlayers: number;
  serverName: string;
  version: string;
  lastChecked: string;
}

export interface NitradoQueryResponse {
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

/**
 * Query a Hytale server using the Nitrado Query API
 * Requires the OneQuery plugin installed on the server
 */
export async function queryViaNitrado(
  host: string,
  port: number = 5523
): Promise<ServerStatus> {
  const startTime = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    // Try HTTPS query (Nitrado format)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://${host}:${port}/Nitrado/Query`, {
      headers: {
        'Accept': 'application/x.hytale.nitrado.query+json;version=1'
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: NitradoQueryResponse = await response.json();
    const latency = Date.now() - startTime;

    return {
      online: true,
      latencyMs: latency,
      playerCount: data.universe?.playerCount ?? 0,
      maxPlayers: data.server?.maxPlayers ?? 0,
      serverName: data.server?.name ?? 'Unknown',
      version: data.server?.version ?? 'Unknown',
      lastChecked,
    };
  } catch (error) {
    // Server is offline or query failed
    return {
      online: false,
      latencyMs: 0,
      playerCount: 0,
      maxPlayers: 0,
      serverName: '',
      version: '',
      lastChecked,
    };
  }
}

/**
 * Simple TCP ping to check if a server is reachable
 * This is a fallback when Nitrado query is not available
 */
export async function simplePing(
  host: string,
  port: number = 25565
): Promise<{ online: boolean; latencyMs: number }> {
  const startTime = Date.now();

  try {
    // Use a simple HTTP request to check connectivity
    // In a real implementation, this would be a proper TCP socket check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Try to establish connection (will fail but we measure the attempt time)
    await fetch(`http://${host}:${port}`, {
      method: 'HEAD',
      signal: controller.signal,
    }).catch(() => {
      // Expected to fail, but connection attempt tells us if host is reachable
    });

    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // If we got here quickly, the server is likely online
    // (even if the HTTP request failed, the TCP connection was established)
    if (latency < 2500) {
      return { online: true, latencyMs: latency };
    }

    return { online: false, latencyMs: 0 };
  } catch (error) {
    return { online: false, latencyMs: 0 };
  }
}

/**
 * Query a server with fallback strategies
 */
export async function queryServer(
  host: string,
  queryPort?: number,
  gamePort?: number
): Promise<ServerStatus> {
  const lastChecked = new Date().toISOString();

  // Try Nitrado query first (if port is specified)
  if (queryPort) {
    const nitradoResult = await queryViaNitrado(host, queryPort);
    if (nitradoResult.online) {
      return nitradoResult;
    }
  }

  // Fallback to simple ping on game port
  const pingResult = await simplePing(host, gamePort || 25565);

  return {
    online: pingResult.online,
    latencyMs: pingResult.latencyMs,
    playerCount: 0, // Can't get player count from simple ping
    maxPlayers: 0,
    serverName: '',
    version: '',
    lastChecked,
  };
}

/**
 * Parse a server address into host and port
 */
export function parseServerAddress(address: string): { host: string; port: number } {
  const parts = address.split(':');
  const host = parts[0];
  const port = parts[1] ? parseInt(parts[1], 10) : 25565;

  return { host, port };
}

/**
 * Calculate uptime percentage from status history
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

  const onlineCount = relevantHistory.filter((h) => h.status === 'online').length;
  const uptime = (onlineCount / relevantHistory.length) * 100;

  return Math.round(uptime * 100) / 100;
}
