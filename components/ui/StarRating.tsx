"use client";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  reviewCount?: number;
}

const sizeConfig = {
  sm: {
    star: "w-3 h-3",
    text: "text-xs",
    gap: "gap-0.5",
  },
  md: {
    star: "w-4 h-4",
    text: "text-sm",
    gap: "gap-1",
  },
  lg: {
    star: "w-5 h-5",
    text: "text-base",
    gap: "gap-1",
  },
};

function StarIcon({
  filled,
  partial = 0,
  className,
}: {
  filled: boolean;
  partial?: number;
  className?: string;
}) {
  if (partial > 0 && partial < 1) {
    // Partial star - use gradient
    const gradientId = `star-gradient-${Math.random().toString(36).substr(2, 9)}`;
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id={gradientId}>
            <stop offset={`${partial * 100}%`} stopColor="#FBBF24" />
            <stop offset={`${partial * 100}%`} stopColor="#374151" />
          </linearGradient>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={`url(#${gradientId})`}
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "#FBBF24" : "#374151"}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  showValue = false,
  reviewCount,
}: StarRatingProps) {
  const sizes = sizeConfig[size];
  const stars = [];

  for (let i = 1; i <= maxRating; i++) {
    if (i <= Math.floor(rating)) {
      // Full star
      stars.push(
        <StarIcon key={i} filled={true} className={sizes.star} />
      );
    } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
      // Partial star
      stars.push(
        <StarIcon
          key={i}
          filled={false}
          partial={rating % 1}
          className={sizes.star}
        />
      );
    } else {
      // Empty star
      stars.push(
        <StarIcon key={i} filled={false} className={sizes.star} />
      );
    }
  }

  return (
    <div className={`inline-flex items-center ${sizes.gap}`}>
      <div className={`flex items-center ${sizes.gap}`}>{stars}</div>
      {showValue && (
        <span className={`${sizes.text} text-white/60 font-medium`}>
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className={`${sizes.text} text-white/40`}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  );
}

// Compact version showing just the average
export function RatingBadge({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = sizeConfig[size];

  return (
    <div className={`inline-flex items-center ${sizes.gap} text-yellow-400`}>
      <svg className={sizes.star} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span className={`${sizes.text} font-medium`}>{rating.toFixed(1)}</span>
      <span className={`${sizes.text} text-white/40`}>({count})</span>
    </div>
  );
}
