/**
 * HyRank composite ranking score — pure, testable, no I/O.
 * Replaces the min-max normalized score with a Bayesian + Reddit-hot + live +
 * retention + uptime − shadow-fraud-penalty formula.
 *
 * Rationale:
 * - Bayesian regresses small-sample ratings toward the global mean (stops 1 5-star
 *   review from pinning a server at #1).
 * - Hot formula (log10-compressed votes + time bonus) prevents whales from
 *   crushing everyone else's vote score to zero and creates momentum signal.
 * - tanh on live-player signal normalizes so a 50-concurrent SMP isn't destroyed
 *   by a 2000-concurrent network.
 * - Retention (fraction of voters who re-vote within 7d) is the anti-bot
 *   nuclear option — bots don't come back.
 * - Shadow-fraud rate directly penalizes servers farming fake votes (self-demote).
 */

export interface ServerSignals {
  /** 0..5 — average user rating */
  ratingMean: number;
  /** number of ratings */
  ratingCount: number;
  /** votes in last 7 days (valid + verified, not shadow) */
  votesLast7d: number;
  /** epoch seconds of the oldest valid vote within the last 7d window */
  firstVoteLast7dUnix: number;
  /** current players online */
  livePlayers: number;
  /** 30-day rolling average of players online (denominator for tanh) */
  avgLivePlayers30d: number;
  /** 0..1 — fraction of distinct voters (last 7d) who voted ≥2 times */
  retention7d: number;
  /** 0..1 — uptime over last 30d */
  uptime30d: number;
  /** 0..1 — fraction of recent votes on this server that were shadow_invalidated */
  shadowFraudRate: number;
}

// Bayesian prior — a new server with 10 5-star reviews regresses to ~(C_PRIOR + tiny bonus)
export const C_GLOBAL_AVG = 3.8;
export const M_PRIOR = 50;
export const HOT_TIME_DIVISOR = 45000; // same constant Reddit uses
export const SHADOW_PENALTY_WEIGHT = 0.4;

export function bayesianRating(
  R: number,
  v: number,
  C: number = C_GLOBAL_AVG,
  m: number = M_PRIOR,
): number {
  if (R + v === 0) return C / 5; // degenerate case
  return ((v / (v + m)) * R + (m / (v + m)) * C);
}

/** Reddit "hot" — log-compressed vote count + time bonus. Votes age out of 7d window. */
export function hotVelocity(votesLast7d: number, firstVoteUnix: number): number {
  const order = Math.log10(Math.max(votesLast7d, 1));
  const seconds = firstVoteUnix - 1_700_000_000; // epoch offset
  return order + seconds / HOT_TIME_DIVISOR;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Composite score — returns real number (unclamped). Higher is better. */
export function compositeScore(s: ServerSignals): {
  composite: number;
  components: {
    bayesianQuality: number;
    hotVelocity: number;
    liveSignal: number;
    retention: number;
    uptime: number;
    shadowFraudPenalty: number;
  };
} {
  const quality = bayesianRating(s.ratingMean, s.ratingCount) / 5; // 0..1
  const velocity = sigmoid(hotVelocity(s.votesLast7d, s.firstVoteLast7dUnix) / 10); // 0..1
  const live = Math.tanh(
    s.livePlayers / Math.max(s.avgLivePlayers30d, 1),
  ); // 0..1
  const retention = Math.max(0, Math.min(1, s.retention7d));
  const uptime = Math.max(0, Math.min(1, s.uptime30d));
  const fraudPenalty = Math.max(0, Math.min(1, s.shadowFraudRate)) * SHADOW_PENALTY_WEIGHT;

  const composite =
    0.35 * quality +
    0.25 * velocity +
    0.20 * live +
    0.15 * retention +
    0.05 * uptime -
    fraudPenalty;

  return {
    composite,
    components: {
      bayesianQuality: quality,
      hotVelocity: velocity,
      liveSignal: live,
      retention,
      uptime,
      shadowFraudPenalty: fraudPenalty,
    },
  };
}
