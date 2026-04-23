"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OwnerClaimWizardProps {
  serverId: string;
  serverName: string;
  onSuccess?: () => void;
}

type Method = "motd" | "ingame";
type Step = "choose" | "token" | "verified";

interface ClaimResult {
  token: string;
  instructions: string;
  status: "created" | "existing_pending";
}

export default function OwnerClaimWizard({
  serverId,
  serverName,
  onSuccess,
}: OwnerClaimWizardProps) {
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<Method>("motd");
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleInitiateClaim = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/servers/${serverId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to initiate claim. Please try again.");
        return;
      }
      const data: ClaimResult = await res.json();
      setClaimResult(data);
      setStep("token");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!claimResult) return;
    try {
      await navigator.clipboard.writeText(claimResult.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  };

  const handleCheckNow = async () => {
    if (!claimResult) return;
    setIsChecking(true);
    setError(null);
    try {
      // Trigger a ping and then poll owner_id
      await fetch(`/api/cron/ping-servers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      }).catch(() => {}); // Best-effort; cron may reject without secret

      // Poll server ownership after a short delay
      await new Promise((r) => setTimeout(r, 3000));

      const res = await fetch(`/api/servers/${serverId}/owner-status`).catch(() => null);
      if (res?.ok) {
        const data: { isOwner: boolean } = await res.json().catch(() => ({ isOwner: false }));
        if (data.isOwner) {
          setStep("verified");
          onSuccess?.();
          return;
        }
      }

      setError(
        "Token not yet detected in your MOTD. Make sure the token is visible and try again in a few minutes.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="glass-card p-6 max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {step === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Claim &ldquo;{serverName}&rdquo;</h3>
              <p className="text-white/50 text-sm">
                Verify you own this server to unlock the owner dashboard and earn the{" "}
                <span className="text-gold-400">Claimed</span> trust badge.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-white/70 text-sm font-medium">Choose verification method:</p>

              {/* MOTD method */}
              <button
                type="button"
                onClick={() => setMethod("motd")}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                  method === "motd"
                    ? "border-hytale-500/50 bg-hytale-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  method === "motd" ? "border-hytale-500" : "border-white/30"
                }`}>
                  {method === "motd" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-hytale-500" />
                  )}
                </div>
                <div>
                  <div className="text-white font-medium text-sm mb-0.5">MOTD Token (Recommended)</div>
                  <div className="text-white/40 text-xs">
                    Add a short token to your server&apos;s Message of the Day. Verified automatically
                    on the next ping (usually within 5 minutes).
                  </div>
                </div>
              </button>

              {/* In-game method */}
              <button
                type="button"
                onClick={() => setMethod("ingame")}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                  method === "ingame"
                    ? "border-hytale-500/50 bg-hytale-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  method === "ingame" ? "border-hytale-500" : "border-white/30"
                }`}>
                  {method === "ingame" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-hytale-500" />
                  )}
                </div>
                <div>
                  <div className="text-white font-medium text-sm mb-0.5 flex items-center gap-2">
                    In-Game Command
                    <span className="px-1.5 py-0.5 bg-white/10 text-white/40 text-xs rounded">
                      Coming soon
                    </span>
                  </div>
                  <div className="text-white/40 text-xs">
                    Run a command in-game via the HyRank Vote Plugin. Requires plugin installation.
                  </div>
                </div>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleInitiateClaim}
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating token…
                </>
              ) : (
                "Continue"
              )}
            </button>
          </motion.div>
        )}

        {step === "token" && claimResult && (
          <motion.div
            key="token"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Add this token to your MOTD</h3>
              <p className="text-white/50 text-sm">
                {claimResult.instructions}
              </p>
            </div>

            {/* Token display */}
            <div className="p-4 bg-night-900 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <code className="text-hytale-400 font-mono text-sm break-all">
                  {claimResult.token}
                </code>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  title="Copy token"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-4 text-sm text-gold-400/90">
              <strong className="font-semibold">How it works:</strong> HyRank automatically pings
              your server every 5 minutes. When your MOTD contains the token above, your ownership
              is confirmed and you receive the Claimed trust badge.
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep("choose"); setError(null); }}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCheckNow}
                disabled={isChecking}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Check now"
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === "verified" && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 py-4"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-forest-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <motion.path
                  d="M20 6L9 17l-5-5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Ownership Verified!</h3>
            <p className="text-white/50 text-sm">
              You&apos;re now the verified owner of &ldquo;{serverName}&rdquo;. You can remove the
              token from your MOTD anytime.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
