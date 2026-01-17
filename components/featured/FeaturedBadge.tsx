"use client";

import { motion } from "framer-motion";

interface FeaturedBadgeProps {
  className?: string;
}

export default function FeaturedBadge({ className = "" }: FeaturedBadgeProps) {
  return (
    <motion.div
      className={`absolute top-3 left-3 z-20 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-legendary-500/90 to-legendary-600/90 backdrop-blur-sm text-void-900 text-xs font-semibold shadow-lg shadow-legendary-500/30">
        <motion.svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="currentColor"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </motion.svg>
        <span>Featured</span>
      </div>
    </motion.div>
  );
}
