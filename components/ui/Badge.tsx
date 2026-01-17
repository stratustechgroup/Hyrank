"use client";

import { ReactNode } from "react";

// Semantic badge variants aligned with Obsidian design system
export type BadgeVariant =
  | "default"
  | "rank"
  | "premium"
  | "verified"
  | "online"
  | "offline"
  | "trending"
  | "new"
  // Legacy variants (backward compatibility)
  | "gold"
  | "green"
  | "purple"
  | "red";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
  icon?: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  // Primary semantic variants (Obsidian design system)
  default: "bg-surface-200 text-platinum-300 border border-white/[0.05]",
  rank: "bg-surface-300 text-platinum-100 font-mono font-bold border-0",
  premium: "bg-gold-500/10 text-gold-400 border border-gold-500/20",
  verified: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  online: "bg-status-online/10 text-status-online border-0",
  offline: "bg-status-offline/10 text-status-offline border-0",
  trending: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  new: "bg-blue-500/10 text-blue-400 border border-blue-500/20",

  // Legacy variants (for backward compatibility)
  gold: "bg-gold-500/20 border border-gold-500/30 text-gold-400",
  green: "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400",
  purple: "bg-purple-500/20 border border-purple-500/30 text-purple-400",
  red: "bg-red-500/20 border border-red-500/30 text-red-400",
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-2xs gap-1",
  md: "px-2 py-0.5 text-xs gap-1.5",
};

export default function Badge({
  variant = "default",
  size = "md",
  children,
  className = "",
  icon,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-md font-medium
        transition-colors duration-fast
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Convenience components for common badge types
export function RankBadge({ rank, className = "" }: { rank: number; className?: string }) {
  return (
    <Badge variant="rank" size="sm" className={className}>
      #{rank}
    </Badge>
  );
}

export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <Badge variant="premium" size="sm" className={className}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      Premium
    </Badge>
  );
}

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <Badge variant="verified" size="sm" className={className}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Verified
    </Badge>
  );
}

export function StatusBadge({
  status,
  className = "",
}: {
  status: "online" | "offline" | "unknown";
  className?: string;
}) {
  const statusConfig = {
    online: { variant: "online" as const, label: "Online" },
    offline: { variant: "offline" as const, label: "Offline" },
    unknown: { variant: "default" as const, label: "Unknown" },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size="sm" className={className}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "online"
            ? "bg-status-online animate-pulse-subtle"
            : status === "offline"
            ? "bg-status-offline"
            : "bg-status-unknown"
        }`}
      />
      {config.label}
    </Badge>
  );
}
