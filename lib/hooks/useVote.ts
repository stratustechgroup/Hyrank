"use client";

import { useState, useEffect, useCallback } from "react";

interface VoteStatus {
  canVote: boolean;
  lastVoteAt: string | null;
  canVoteAt: string | null;
  remainingMs: number;
  isLoading: boolean;
  error: string | null;
}

interface VoteResult {
  success: boolean;
  voteId?: string;
  message: string;
  nextVoteAt?: string;
  error?: string;
  canVoteAt?: string;
  remainingMs?: number;
}

export function useVote(serverId: string) {
  const [status, setStatus] = useState<VoteStatus>({
    canVote: true,
    lastVoteAt: null,
    canVoteAt: null,
    remainingMs: 0,
    isLoading: true,
    error: null,
  });

  const [isVoting, setIsVoting] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  // Fetch initial vote status
  const checkStatus = useCallback(async () => {
    try {
      setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/servers/${serverId}/vote`);
      const data = await response.json();

      if (response.ok) {
        setStatus({
          canVote: data.canVote,
          lastVoteAt: data.lastVoteAt,
          canVoteAt: data.canVoteAt,
          remainingMs: data.remainingMs,
          isLoading: false,
          error: null,
        });
      } else {
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: data.error || "Failed to check vote status",
        }));
      }
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to connect to server",
      }));
    }
  }, [serverId]);

  // Submit vote
  const vote = useCallback(
    async (options?: { visitorId?: string; username?: string }): Promise<VoteResult> => {
      setIsVoting(true);

      try {
        const response = await fetch(`/api/servers/${serverId}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(options || {}),
        });

        const data = await response.json();

        if (response.ok) {
          // Update status after successful vote
          setStatus({
            canVote: false,
            lastVoteAt: new Date().toISOString(),
            canVoteAt: data.nextVoteAt,
            remainingMs: 24 * 60 * 60 * 1000, // 24 hours
            isLoading: false,
            error: null,
          });

          return {
            success: true,
            voteId: data.voteId,
            message: data.message,
            nextVoteAt: data.nextVoteAt,
          };
        } else {
          // Handle error responses
          if (response.status === 429) {
            // Cooldown active
            setStatus({
              canVote: false,
              lastVoteAt: null,
              canVoteAt: data.canVoteAt,
              remainingMs: data.remainingMs || 0,
              isLoading: false,
              error: null,
            });
          }

          return {
            success: false,
            message: data.message || data.error || "Failed to vote",
            error: data.error,
            canVoteAt: data.canVoteAt,
            remainingMs: data.remainingMs,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: "Failed to connect to server",
          error: "Network error",
        };
      } finally {
        setIsVoting(false);
      }
    },
    [serverId]
  );

  // Format countdown timer
  useEffect(() => {
    if (status.remainingMs <= 0 || status.canVote) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = status.canVoteAt
        ? new Date(status.canVoteAt).getTime()
        : now + status.remainingMs;
      const remaining = target - now;

      if (remaining <= 0) {
        setCountdown(null);
        setStatus((prev) => ({
          ...prev,
          canVote: true,
          remainingMs: 0,
        }));
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status.remainingMs, status.canVoteAt, status.canVote]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    ...status,
    isVoting,
    countdown,
    vote,
    checkStatus,
  };
}
