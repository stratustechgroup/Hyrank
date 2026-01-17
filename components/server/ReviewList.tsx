"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StarRating from "@/components/ui/StarRating";

export interface Review {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  helpfulCount: number;
  ownerResponse?: {
    content: string;
    timestamp: string;
  };
}

interface ReviewListProps {
  reviews: Review[];
  totalCount: number;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onMarkHelpful?: (reviewId: string) => Promise<void>;
  onReport?: (reviewId: string) => Promise<void>;
}

function ReviewCard({
  review,
  onMarkHelpful,
  onReport,
}: {
  review: Review;
  onMarkHelpful?: (reviewId: string) => Promise<void>;
  onReport?: (reviewId: string) => Promise<void>;
}) {
  const [isHelpfulLoading, setIsHelpfulLoading] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false);

  const handleHelpful = async () => {
    if (!onMarkHelpful || hasMarkedHelpful) return;
    setIsHelpfulLoading(true);
    try {
      await onMarkHelpful(review.id);
      setHelpfulCount((prev) => prev + 1);
      setHasMarkedHelpful(true);
    } catch (error) {
      console.error("Failed to mark helpful:", error);
    } finally {
      setIsHelpfulLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const initials = review.username.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white/5 rounded-xl border border-white/5"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {review.avatar ? (
          <img
            src={review.avatar}
            alt={review.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-adventure-500 to-legendary-500 flex items-center justify-center text-sm font-bold text-white">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white">{review.username}</span>
            <StarRating rating={review.rating} size="sm" />
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {formatDate(review.createdAt)}
            {review.updatedAt && review.updatedAt !== review.createdAt && (
              <span className="ml-1">(edited)</span>
            )}
          </p>
        </div>
      </div>

      {/* Content */}
      <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
        {review.content}
      </p>

      {/* Owner Response */}
      {review.ownerResponse && (
        <div className="mt-4 p-3 bg-adventure-500/10 border border-adventure-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-adventure-400 uppercase tracking-wider">
              Owner Response
            </span>
            <span className="text-xs text-white/40">
              {formatDate(review.ownerResponse.timestamp)}
            </span>
          </div>
          <p className="text-white/80 text-sm">{review.ownerResponse.content}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        <button
          onClick={handleHelpful}
          disabled={isHelpfulLoading || hasMarkedHelpful}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            hasMarkedHelpful
              ? "text-adventure-400"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={hasMarkedHelpful ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          <span>
            Helpful{helpfulCount > 0 && ` (${helpfulCount})`}
          </span>
        </button>

        {onReport && (
          <button
            onClick={() => onReport(review.id)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            <span>Report</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function ReviewList({
  reviews,
  totalCount,
  isLoading,
  onLoadMore,
  hasMore,
  onMarkHelpful,
  onReport,
}: ReviewListProps) {
  if (isLoading && reviews.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-4 bg-white/5 rounded-xl border border-white/5 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="w-24 h-4 bg-white/10 rounded" />
                <div className="w-16 h-3 bg-white/10 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full h-3 bg-white/10 rounded" />
              <div className="w-3/4 h-3 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No reviews yet</h3>
        <p className="text-white/50 text-sm">
          Be the first to share your experience with this server
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Reviews ({totalCount})
        </h3>
      </div>

      {/* Review List */}
      <AnimatePresence mode="popLayout">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onMarkHelpful={onMarkHelpful}
            onReport={onReport}
          />
        ))}
      </AnimatePresence>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          className="w-full py-3 text-center text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          {isLoading ? "Loading..." : "Load more reviews"}
        </button>
      )}
    </div>
  );
}
