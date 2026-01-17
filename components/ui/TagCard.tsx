"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { TagCategory } from "@/lib/data";

interface TagCardProps {
  tag: TagCategory;
  index: number;
}

// Tag-specific icons and colors
const TAG_STYLES: Record<string, { icon: JSX.Element; gradient: string; iconColor: string }> = {
  SMP: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    gradient: "from-hytale-500 to-electric-500",
    iconColor: "text-hytale-400",
  },
  RPG: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    gradient: "from-purple-500 to-violet-500",
    iconColor: "text-purple-400",
  },
  Minigames: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
    gradient: "from-pink-500 to-rose-500",
    iconColor: "text-pink-400",
  },
  Factions: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
    gradient: "from-red-500 to-orange-500",
    iconColor: "text-red-400",
  },
  Creative: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
    gradient: "from-gold-500 to-amber-500",
    iconColor: "text-gold-400",
  },
  PvP: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6" />
        <path d="M16 16l4 4" />
        <path d="M19 21l2-2" />
      </svg>
    ),
    gradient: "from-orange-500 to-red-500",
    iconColor: "text-orange-400",
  },
  Economy: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
    gradient: "from-emerald-500 to-teal-500",
    iconColor: "text-emerald-400",
  },
  Survival: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    gradient: "from-green-500 to-emerald-500",
    iconColor: "text-green-400",
  },
  Adventure: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="10" r="8" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 10H2" />
        <path d="M22 10h-2.93" />
        <path d="M12 10l3 3" />
      </svg>
    ),
    gradient: "from-cyan-500 to-blue-500",
    iconColor: "text-cyan-400",
  },
  Hardcore: {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    gradient: "from-rose-500 to-pink-500",
    iconColor: "text-rose-400",
  },
};

const DEFAULT_STYLE = {
  icon: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  gradient: "from-white/40 to-white/60",
  iconColor: "text-white/60",
};

export default function TagCard({ tag, index }: TagCardProps) {
  const style = TAG_STYLES[tag.name] || DEFAULT_STYLE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/tags/${tag.slug}`}>
        <div className="group relative p-6 rounded-2xl bg-night-800/60 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer h-full">
          {/* Hover glow effect */}
          <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl pointer-events-none`} />

          <div className="relative">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {style.icon}
            </div>

            {/* Name */}
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-hytale-400 transition-colors">
              {tag.name}
            </h3>

            {/* Description */}
            <p className="text-white/50 text-sm mb-4 line-clamp-2 leading-relaxed">
              {tag.description}
            </p>

            {/* Server Count */}
            <div className="flex items-center gap-2 text-sm">
              <span className={style.iconColor + " font-semibold"}>{tag.serverCount}</span>
              <span className="text-white/40">servers</span>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
