"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";

interface ReviewFormProps {
  serverId: string;
  onSubmit: (review: { rating: number; content: string }) => Promise<void>;
  existingReview?: {
    rating: number;
    content: string;
  } | null;
}

export default function ReviewForm({
  serverId,
  onSubmit,
  existingReview,
}: ReviewFormProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState(existingReview?.content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    if (content.length < 10) {
      setError("Review must be at least 10 characters");
      return;
    }

    if (content.length > 1000) {
      setError("Review must be less than 1000 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ rating, content });
      setSuccess(true);
      if (!existingReview) {
        setRating(0);
        setContent("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Sign in to leave a review
        </h3>
        <p className="text-white/60 text-sm mb-4">
          Share your experience with this server
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 bg-adventure-500 hover:bg-adventure-600 text-white rounded-lg transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (success && !existingReview) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Review submitted!
        </h3>
        <p className="text-white/60 text-sm">
          Thank you for sharing your experience
        </p>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">
        {existingReview ? "Update your review" : "Write a review"}
      </h3>

      {/* Star Rating */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Your rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <svg
                className={`w-8 h-8 transition-colors ${
                  star <= displayRating
                    ? "text-legendary-400"
                    : "text-white/20"
                }`}
                viewBox="0 0 24 24"
                fill={star <= displayRating ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-white/40 mt-1">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Great"}
            {rating === 5 && "Excellent"}
          </p>
        )}
      </div>

      {/* Review Content */}
      <div>
        <label className="block text-sm text-white/60 mb-2">
          Your review
          <span className="text-white/40 ml-2">
            ({content.length}/1000 characters)
          </span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with this server..."
          rows={4}
          className="w-full px-4 py-3 bg-void-800/50 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-adventure-500/50 focus:border-adventure-500/50 resize-none"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full py-3 bg-adventure-500 hover:bg-adventure-600 disabled:bg-white/10 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
      >
        {isSubmitting ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Submitting...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {existingReview ? "Update Review" : "Submit Review"}
          </>
        )}
      </motion.button>
    </form>
  );
}
