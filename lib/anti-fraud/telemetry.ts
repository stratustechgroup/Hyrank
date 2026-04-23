"use client";

/**
 * Runs for the lifetime of a client page view. Accumulates simple behavioral
 * signals we later send with the vote POST. No PII; no persistence.
 */
export interface BehavioralTelemetry {
  mouseEntropy: number;   // 0-1 (coverage of the viewport)
  dwellMs: number;        // time since first interaction
  tabWasVisible: boolean; // was tab visible the whole time
}

export function initTelemetry(): () => BehavioralTelemetry {
  const startedAt = Date.now();
  const cells = new Set<string>();
  let tabHiddenOnce = document.visibilityState === "hidden";

  function onMove(e: MouseEvent) {
    // 32 buckets per axis -> 1024 cells total, ratio gives entropy 0-1
    const x = Math.floor((e.clientX / window.innerWidth) * 32);
    const y = Math.floor((e.clientY / window.innerHeight) * 32);
    cells.add(`${x}:${y}`);
  }
  function onVis() {
    if (document.visibilityState === "hidden") tabHiddenOnce = true;
  }
  window.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVis);

  return () => {
    window.removeEventListener("mousemove", onMove);
    document.removeEventListener("visibilitychange", onVis);
    return {
      mouseEntropy: Math.min(cells.size / 1024, 1),
      dwellMs: Date.now() - startedAt,
      tabWasVisible: !tabHiddenOnce,
    };
  };
}
