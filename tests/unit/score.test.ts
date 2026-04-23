import { describe, test, expect } from "vitest";
import { computeTrustScore, verdictFromScore } from "@/lib/anti-fraud/score";

describe("computeTrustScore", () => {
  const baseline = {
    accountAgeSeconds: 60 * 24 * 3600,
    fingerprintFresh: true,
    ipBucketOk: true,
    mouseEntropy: 0.5,
    dwellMs: 4000,
    tabWasVisible: true,
  };

  test("baseline human-ish voter scores above 40", () => {
    expect(computeTrustScore(baseline)).toBeGreaterThanOrEqual(40);
  });

  test("fingerprint re-use crushes score", () => {
    const score = computeTrustScore({ ...baseline, fingerprintFresh: false });
    expect(score).toBeLessThan(40);
    expect(verdictFromScore(score)).toBe("shadow_invalidated");
  });

  test("sub-500ms dwell is bot-like", () => {
    const score = computeTrustScore({ ...baseline, dwellMs: 200 });
    expect(score).toBeLessThan(40);
  });

  test("score clamps to [0,100]", () => {
    const worst = {
      accountAgeSeconds: 0,
      fingerprintFresh: false,
      ipBucketOk: false,
      mouseEntropy: 0,
      dwellMs: 0,
      tabWasVisible: false,
    };
    expect(computeTrustScore(worst)).toBeGreaterThanOrEqual(0);
    const best = {
      accountAgeSeconds: 365 * 24 * 3600,
      fingerprintFresh: true,
      ipBucketOk: true,
      mouseEntropy: 1,
      dwellMs: 30_000,
      tabWasVisible: true,
    };
    expect(computeTrustScore(best)).toBeLessThanOrEqual(100);
  });
});
