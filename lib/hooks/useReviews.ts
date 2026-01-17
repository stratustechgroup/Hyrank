"use client";

import { useState, useEffect, useCallback } from "react";
import { Review } from "@/components/server/ReviewList";

interface UseReviewsResult {
  reviews: Review[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  submitReview: (review: { rating: number; content: string }) => Promise<void>;
  markHelpful: (reviewId: string) => Promise<void>;
  reportReview: (reviewId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReviews(serverId: string): UseReviewsResult {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = useCallback(
    async (pageNum: number, append: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/servers/${serverId}/reviews?page=${pageNum}&limit=10`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch reviews");
        }

        const data = await response.json();

        setReviews((prev) =>
          append ? [...prev, ...data.reviews] : data.reviews
        );
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reviews");
      } finally {
        setIsLoading(false);
      }
    },
    [serverId]
  );

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchReviews(page + 1, true);
    }
  }, [fetchReviews, hasMore, isLoading, page]);

  const submitReview = useCallback(
    async (review: { rating: number; content: string }) => {
      const response = await fetch(`/api/servers/${serverId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit review");
      }

      // Refresh reviews after submission
      await fetchReviews(1);
    },
    [serverId, fetchReviews]
  );

  const markHelpful = useCallback(
    async (reviewId: string) => {
      const response = await fetch(
        `/api/servers/${serverId}/reviews/${reviewId}/helpful`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark as helpful");
      }
    },
    [serverId]
  );

  const reportReview = useCallback(
    async (reviewId: string) => {
      const response = await fetch(
        `/api/servers/${serverId}/reviews/${reviewId}/report`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to report review");
      }

      // Remove from local state
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setTotalCount((prev) => prev - 1);
    },
    [serverId]
  );

  const refresh = useCallback(async () => {
    await fetchReviews(1);
  }, [fetchReviews]);

  return {
    reviews,
    totalCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    submitReview,
    markHelpful,
    reportReview,
    refresh,
  };
}
