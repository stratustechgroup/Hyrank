"use client";

type TrustTier = "unverified" | "claimed" | "verified" | "partner" | "banned";

interface TrustTierBadgeProps {
  tier: TrustTier | string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

const TIER_STYLES: Record<TrustTier, { label: string; colors: string; iconPath: string }> = {
  unverified: {
    label: "Unverified",
    colors: "bg-white/5 text-white/40 border-white/10",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
  },
  claimed: {
    label: "Claimed",
    colors: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    iconPath: "M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z",
  },
  verified: {
    label: "Verified",
    colors: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    iconPath: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  },
  partner: {
    label: "Partner",
    colors: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    iconPath:
      "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z",
  },
  banned: {
    label: "Banned",
    colors: "bg-red-500/10 text-red-400 border-red-500/20",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z",
  },
};

function normalizeTier(t: unknown): TrustTier {
  if (t === "claimed" || t === "verified" || t === "partner" || t === "banned") return t;
  return "unverified";
}

export default function TrustTierBadge({
  tier,
  size = "sm",
  className = "",
}: TrustTierBadgeProps) {
  const normalized = normalizeTier(tier);
  if (normalized === "unverified") return null; // don't clutter UI for default tier
  const style = TIER_STYLES[normalized];
  const sizeClasses = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${style.colors} ${sizeClasses} ${className}`}
      aria-label={`Trust tier: ${style.label}`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d={style.iconPath} />
      </svg>
      {style.label}
    </span>
  );
}
