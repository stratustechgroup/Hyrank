/**
 * Trust score computation — pure, testable, no I/O.
 * Inputs come from: session (Discord OAuth), headers (IP/UA), client telemetry,
 * Redis state (fingerprint already seen? IP bucket exceeded?).
 * Output: numeric score 0-100. Status derived at call site:
 *   score >= 40 -> 'valid'
 *   score <  40 -> 'shadow_invalidated'  (always return 200 to client)
 */
export interface TrustScoreInputs {
  /** seconds since Discord account creation; undefined if not authed */
  accountAgeSeconds?: number;
  /** did FingerprintJS visitorId already vote this server in the 12h bucket? */
  fingerprintFresh: boolean;
  /** did IP sliding window (5 votes / 10min) exceed? */
  ipBucketOk: boolean;
  /** 0-1 measure of mouse entropy during page visit */
  mouseEntropy: number;
  /** milliseconds the user spent on the page before clicking vote */
  dwellMs: number;
  /** was the tab visible for the entire dwell? */
  tabWasVisible: boolean;
}

const SEVEN_DAYS_SEC = 7 * 24 * 3600;

export function computeTrustScore(inputs: TrustScoreInputs): number {
  let score = 50;

  // Account age: Discord accounts < 7 days old are suspicious
  if (inputs.accountAgeSeconds !== undefined && inputs.accountAgeSeconds < SEVEN_DAYS_SEC) {
    score -= 20;
  }

  // Fingerprint re-use in same 12h window: strong fraud signal
  if (!inputs.fingerprintFresh) score -= 40;

  // IP rate limit exceeded
  if (!inputs.ipBucketOk) score -= 30;

  // Behavioral: mouse entropy contributes up to +20, cap at 20
  score += Math.min(Math.max(inputs.mouseEntropy, 0) * 20, 20);

  // Dwell time: > 3s = likely human, < 500ms = bot
  if (inputs.dwellMs > 3000) score += 10;
  else if (inputs.dwellMs < 500) score -= 30;

  // Tab visibility: hidden tabs during vote is suspicious
  score += inputs.tabWasVisible ? 5 : -15;

  return Math.max(0, Math.min(100, score));
}

export function verdictFromScore(score: number): "valid" | "shadow_invalidated" {
  return score >= 40 ? "valid" : "shadow_invalidated";
}
