/**
 * Unit tests for lib/server-query orchestrator and sub-modules.
 *
 * @hytaleone/query is mocked at the module level so no real UDP sockets
 * are opened during CI. The mock returns configurable results so we can
 * exercise every branch of the orchestrator.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import type { ServerInfo } from "@hytaleone/query";

// ── Mock @hytaleone/query before any tested module imports it ──────────────
// Use vi.hoisted so mockQuery is initialized before the vi.mock() factory runs
const { mockQuery } = vi.hoisted(() => {
  return {
    mockQuery: vi.fn<[string, number?, { timeout?: number; full?: boolean }?], Promise<ServerInfo>>(),
  };
});

vi.mock("@hytaleone/query", () => ({
  query: mockQuery,
}));

// ── Imports must come AFTER vi.mock() ─────────────────────────────────────
import { queryServer, parseServerAddress, calculateUptime } from "@/lib/server-query";
import { queryViaUdp } from "@/lib/server-query/udp";
import { queryViaNitrado } from "@/lib/server-query/nitrado";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeServerInfo(overrides: Partial<ServerInfo> = {}): ServerInfo {
  return {
    serverName: "Test Server",
    motd: "Welcome to Test Server",
    currentPlayers: 5,
    maxPlayers: 20,
    hostPort: 5520,
    version: "1.0.0",
    protocolVersion: 1,
    protocolHash: "abc123",
    supportsV2: false,
    isNetworkMode: false,
    v2Version: 0,
    ...overrides,
  };
}

// ── queryViaUdp unit tests ─────────────────────────────────────────────────

describe("queryViaUdp", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("returns online status with all fields on success", async () => {
    mockQuery.mockResolvedValueOnce(
      makeServerInfo({ serverName: "MyServer", motd: "Hello!", currentPlayers: 3, maxPlayers: 10, version: "2.0" })
    );

    const result = await queryViaUdp("play.example.com", 5520, 5000);

    expect(result.online).toBe(true);
    expect(result.source).toBe("udp-v1");
    expect(result.serverName).toBe("MyServer");
    expect(result.motd).toBe("Hello!");
    expect(result.playerCount).toBe(3);
    expect(result.maxPlayers).toBe(10);
    expect(result.version).toBe("2.0");
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.lastChecked).toBeTruthy();
  });

  test("passes correct host and port to query()", async () => {
    mockQuery.mockResolvedValueOnce(makeServerInfo());

    await queryViaUdp("myserver.gg", 5521, 3000);

    expect(mockQuery).toHaveBeenCalledWith("myserver.gg", 5521, { timeout: 3000 });
  });

  test("returns offline status on query error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await queryViaUdp("offline.example.com");

    expect(result.online).toBe(false);
    expect(result.latencyMs).toBeNull();
    expect(result.motd).toBe("");
    expect(result.playerCount).toBe(0);
    expect(result.source).toBe("udp-v1");
  });

  test("returns offline when query times out", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Query timed out"));

    const result = await queryViaUdp("slow.example.com", 5520, 100);

    expect(result.online).toBe(false);
    expect(result.latencyMs).toBeNull();
  });

  test("uses default port 5520", async () => {
    mockQuery.mockResolvedValueOnce(makeServerInfo());

    await queryViaUdp("myserver.gg");

    expect(mockQuery).toHaveBeenCalledWith("myserver.gg", 5520, expect.any(Object));
  });
});

// ── queryServer orchestrator tests ────────────────────────────────────────

describe("queryServer orchestrator", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("returns UDP result immediately when UDP succeeds", async () => {
    mockQuery.mockResolvedValueOnce(
      makeServerInfo({ serverName: "UDPServer", motd: "UDP MOTD" })
    );

    const result = await queryServer("myserver.gg", 5523, 5520);

    expect(result.online).toBe(true);
    expect(result.source).toBe("udp-v1");
    expect(result.serverName).toBe("UDPServer");
    // UDP succeeded — query() should have been called exactly once
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test("falls through to nitrado when UDP fails, nitrado succeeds", async () => {
    // UDP fails
    mockQuery.mockRejectedValueOnce(new Error("unreachable"));

    // Mock fetch for Nitrado path
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        server: { name: "NitradoServer", version: "1.1", maxPlayers: 50 },
        universe: { playerCount: 15 },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryServer("myserver.gg", 5523, 5520);

    expect(result.online).toBe(true);
    expect(result.source).toBe("nitrado");

    vi.unstubAllGlobals();
  });

  test("returns unknown source when both UDP and nitrado fail", async () => {
    // UDP fails
    mockQuery.mockRejectedValueOnce(new Error("unreachable"));

    // Nitrado fetch also fails
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await queryServer("dead.example.com", 5523, 5520);

    expect(result.online).toBe(false);
    expect(result.source).toBe("unknown");

    vi.unstubAllGlobals();
  });

  test("skips nitrado when no queryPort provided and UDP fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("unreachable"));

    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await queryServer("dead.example.com", undefined, 5520);

    expect(result.online).toBe(false);
    expect(result.source).toBe("unknown");
    // fetch should not have been called (no Nitrado port)
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  test("motd field is present in result", async () => {
    mockQuery.mockResolvedValueOnce(makeServerInfo({ motd: "HYRANK_TOKEN_abc123" }));

    const result = await queryServer("myserver.gg");

    expect(result.motd).toBe("HYRANK_TOKEN_abc123");
  });
});

// ── parseServerAddress tests ───────────────────────────────────────────────

describe("parseServerAddress", () => {
  test("parses host:port correctly", () => {
    expect(parseServerAddress("myserver.gg:5520")).toEqual({
      host: "myserver.gg",
      port: 5520,
    });
  });

  test("uses default port 25565 when no port given", () => {
    expect(parseServerAddress("myserver.gg")).toEqual({
      host: "myserver.gg",
      port: 25565,
    });
  });

  test("handles IPv4 address with port", () => {
    expect(parseServerAddress("192.168.1.1:5520")).toEqual({
      host: "192.168.1.1",
      port: 5520,
    });
  });
});

// ── calculateUptime tests ──────────────────────────────────────────────────

describe("calculateUptime", () => {
  const now = Date.now();
  const hoursBack = 24;

  function makeRecord(status: string, msAgo: number) {
    return {
      status,
      recorded_at: new Date(now - msAgo).toISOString(),
    };
  }

  test("returns null for empty history", () => {
    expect(calculateUptime([], 24)).toBeNull();
  });

  test("100% uptime when all records are online", () => {
    const history = [
      makeRecord("online", 1000),
      makeRecord("online", 2000),
      makeRecord("online", 3000),
    ];
    expect(calculateUptime(history, hoursBack)).toBe(100);
  });

  test("0% uptime when all records are offline", () => {
    const history = [
      makeRecord("offline", 1000),
      makeRecord("offline", 2000),
    ];
    expect(calculateUptime(history, hoursBack)).toBe(0);
  });

  test("50% uptime with mixed records", () => {
    const history = [
      makeRecord("online", 1000),
      makeRecord("offline", 2000),
    ];
    expect(calculateUptime(history, hoursBack)).toBe(50);
  });

  test("ignores records outside the time window", () => {
    const history = [
      makeRecord("online", 1000),
      // This record is outside the 1-hour window
      makeRecord("offline", 2 * 60 * 60 * 1000),
    ];
    expect(calculateUptime(history, 1)).toBe(100);
  });

  test("returns null when all records are outside window", () => {
    const history = [makeRecord("online", 48 * 60 * 60 * 1000)];
    expect(calculateUptime(history, 24)).toBeNull();
  });
});
