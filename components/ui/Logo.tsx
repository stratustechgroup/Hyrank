"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  animated?: boolean;
  href?: string;
  className?: string;
}

const sizes = {
  sm: { icon: 28, text: "text-lg" },
  md: { icon: 36, text: "text-xl" },
  lg: { icon: 48, text: "text-2xl" },
  xl: { icon: 64, text: "text-3xl" },
};

export default function Logo({
  size = "md",
  showText = true,
  animated = true,
  href = "/",
  className = "",
}: LogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size];

  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Animated Logo Icon */}
      <motion.div
        className="relative"
        initial={animated ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Glow effect behind logo */}
        <div
          className="absolute inset-0 blur-xl opacity-60"
          style={{
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)",
            width: iconSize * 1.5,
            height: iconSize * 1.5,
            left: -iconSize * 0.25,
            top: -iconSize * 0.25,
          }}
        />

        {/* SVG Logo */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <defs>
            {/* Main gradient */}
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            {/* Gold accent gradient */}
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Inner glow */}
            <radialGradient id="innerGlow" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>

            {/* Shadow filter */}
            <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.3" />
            </filter>

            {/* Glow filter */}
            <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background hexagon shape */}
          <motion.path
            d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
            fill="url(#logoGradient)"
            filter="url(#logoShadow)"
            initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Inner glow overlay */}
          <path d="M32 4L56 18V46L32 60L8 46V18L32 4Z" fill="url(#innerGlow)" />

          {/* Border highlight */}
          <motion.path
            d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
            initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />

          {/* H letter - stylized */}
          <motion.g
            filter="url(#logoGlow)"
            initial={animated ? { scale: 0.5, opacity: 0 } : { scale: 1, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Left vertical */}
            <rect x="18" y="20" width="6" height="24" rx="2" fill="white" />
            {/* Right vertical */}
            <rect x="40" y="20" width="6" height="24" rx="2" fill="white" />
            {/* Horizontal bar */}
            <rect x="18" y="29" width="28" height="6" rx="2" fill="white" />
          </motion.g>

          {/* Crown/rank indicator (gold accent) */}
          <motion.g
            initial={animated ? { y: -10, opacity: 0 } : { y: 0, opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <path
              d="M26 14L32 8L38 14L36 12L32 16L28 12L26 14Z"
              fill="url(#goldGradient)"
            />
          </motion.g>

          {/* Decorative dots */}
          <motion.circle
            cx="32"
            cy="52"
            r="2"
            fill="url(#goldGradient)"
            initial={animated ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 1, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      {/* Logo Text */}
      {showText && (
        <motion.div
          className="flex flex-col"
          initial={animated ? { x: -10, opacity: 0 } : false}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className={`font-bold tracking-tight ${textSize} bg-clip-text text-transparent bg-gradient-to-r from-hytale-300 via-hytale-400 to-hytale-500`}
          >
            HyRank
          </span>
          {size !== "sm" && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-platinum-500">
              Server List
            </span>
          )}
        </motion.div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-hytale-500/50 rounded-lg">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

// Compact icon-only version for collapsed sidebar
export function LogoIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 blur-lg opacity-50"
        style={{
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 70%)",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="logoGradientCompact" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="goldGradientCompact" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="logoShadowCompact" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#06b6d4" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Hexagon background */}
        <path
          d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
          fill="url(#logoGradientCompact)"
          filter="url(#logoShadowCompact)"
        />

        {/* H letter */}
        <g>
          <rect x="18" y="20" width="6" height="24" rx="2" fill="white" />
          <rect x="40" y="20" width="6" height="24" rx="2" fill="white" />
          <rect x="18" y="29" width="28" height="6" rx="2" fill="white" />
        </g>

        {/* Crown accent */}
        <path d="M26 14L32 8L38 14L36 12L32 16L28 12L26 14Z" fill="url(#goldGradientCompact)" />

        {/* Decorative dot */}
        <circle cx="32" cy="52" r="2" fill="url(#goldGradientCompact)" />
      </svg>
    </div>
  );
}
