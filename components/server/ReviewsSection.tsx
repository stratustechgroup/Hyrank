"use client";

import { useReviews } from "@/lib/hooks/useReviews";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";

interface ReviewsSectionProps {
  serverId: string;
}

export default function ReviewsSection({ serverId }: ReviewsSectionProps) {
  const {
    reviews,
    totalCount,
    isLoading,
    hasMore,
    loadMore,
    submitReview,
    markHelpful,
    reportReview,
  } = useReviews(serverId);

  return (
    <div className="space-y-6">
      {/* Review Form */}
      <ReviewForm serverId={serverId} onSubmit={submitReview} />

      {/* Reviews List */}
      <ReviewList
        reviews={reviews}
        totalCount={totalCount}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onMarkHelpful={markHelpful}
        onReport={reportReview}
      />
    </div>
  );
}
