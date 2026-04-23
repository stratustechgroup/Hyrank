import { describe, test, expect } from "vitest";
import {
  compositeScore,
  bayesianRating,
  hotVelocity,
  C_GLOBAL_AVG,
  M_PRIOR,
} from "@/lib/ranking/score";

describe("bayesianRating", () => {
  test("small-n regresses to global mean", () => {
    const score = bayesianRating(5.0, 1); // 1 perfect vote
    expect(score).toBeLessThan(4.0);
    expect(score).toBeGreaterThan(C_GLOBAL_AVG);
  });
  test("large-n reflects rating", () => {
    const score = bayesianRating(5.0, 10000);
    expect(score).toBeGreaterThan(4.9);
  });
  test("zero votes returns prior", () => {
    expect(bayesianRating(0, 0)).toBeCloseTo(C_GLOBAL_AVG / 5, 2);
  });
});

describe("hotVelocity", () => {
  test("more recent votes score higher than older with same count", () => {
    const now = Math.floor(Date.now() / 1000);
    const newer = hotVelocity(100, now);
    const older = hotVelocity(100, now - 7 * 24 * 3600);
    expect(newer).toBeGreaterThan(older);
  });
  test("more votes score higher than few with same time", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(hotVelocity(1000, now)).toBeGreaterThan(hotVelocity(10, now));
  });
});

describe("compositeScore", () => {
  const baseline = {
    ratingMean: 4.0,
    ratingCount: 100,
    votesLast7d: 50,
    firstVoteLast7dUnix: Math.floor(Date.now() / 1000) - 3 * 24 * 3600,
    livePlayers: 50,
    avgLivePlayers30d: 50,
    retention7d: 0.3,
    uptime30d: 0.98,
    shadowFraudRate: 0,
  };

  test("baseline returns reasonable composite", () => {
    const { composite } = compositeScore(baseline);
    expect(composite).toBeGreaterThan(0.3);
    expect(composite).toBeLessThan(1);
  });

  test("high shadow fraud rate tanks score", () => {
    const a = compositeScore(baseline).composite;
    const b = compositeScore({ ...baseline, shadowFraudRate: 1.0 }).composite;
    expect(b).toBeLessThan(a);
    expect(a - b).toBeCloseTo(0.4, 1); // full penalty
  });

  test("new server (1 vote) does not dominate baseline", () => {
    const brigaded = compositeScore({
      ...baseline,
      ratingMean: 5.0,
      ratingCount: 1,
      votesLast7d: 1,
    }).composite;
    expect(brigaded).toBeLessThan(compositeScore(baseline).composite);
  });

  test("components sum consistently", () => {
    const { composite, components } = compositeScore(baseline);
    const sum =
      0.35 * components.bayesianQuality +
      0.25 * components.hotVelocity +
      0.20 * components.liveSignal +
      0.15 * components.retention +
      0.05 * components.uptime -
      components.shadowFraudPenalty;
    expect(composite).toBeCloseTo(sum, 6);
  });
});
