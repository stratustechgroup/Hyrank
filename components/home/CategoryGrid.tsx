"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const CATEGORIES = [
  { name: "Survival", slug: "smp", icon: "mountain", count: 45, gradient: "from-emerald-500 to-teal-500" },
  { name: "PvP", slug: "pvp", icon: "swords", count: 38, gradient: "from-red-500 to-orange-500" },
  { name: "RPG", slug: "rpg", icon: "scroll", count: 32, gradient: "from-purple-500 to-violet-500" },
  { name: "Minigames", slug: "minigames", icon: "gamepad", count: 28, gradient: "from-blue-500 to-indigo-500" },
  { name: "Economy", slug: "economy", icon: "coins", count: 24, gradient: "from-gold-500 to-amber-500" },
  { name: "Creative", slug: "creative", icon: "palette", count: 18, gradient: "from-hytale-500 to-electric-500" },
];

function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    mountain: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
      </svg>
    ),
    swords: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
        <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
        <line x1="5" y1="14" x2="9" y2="18" />
        <line x1="7" y1="17" x2="4" y2="20" />
        <line x1="3" y1="19" x2="5" y2="21" />
      </svg>
    ),
    scroll: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
        <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      </svg>
    ),
    gamepad: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="2" />
      </svg>
    ),
    coins: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8" cy="8" r="6" />
        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
        <path d="M7 6h1v4" />
        <path d="m16.71 13.88.7.71-2.82 2.82" />
      </svg>
    ),
    palette: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="13.5" cy="6.5" r=".5" />
        <circle cx="17.5" cy="10.5" r=".5" />
        <circle cx="8.5" cy="7.5" r=".5" />
        <circle cx="6.5" cy="12.5" r=".5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
  };
  return icons[icon] || null;
}

export default function CategoryGrid() {
  return (
    <section className="py-10">
      {/* Section Header */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-2xl lg:text-3xl font-bold text-platinum-100">
            Browse by Category
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border bg-surface-200/60 border-white/[0.06] text-platinum-400">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            {CATEGORIES.length} types
          </span>
        </div>
        <Link
          href="/tags"
          className="group flex items-center gap-2 text-sm font-medium text-platinum-400 hover:text-hytale-400 transition-colors"
        >
          All Categories
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </motion.div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORIES.map((category, index) => (
          <motion.div
            key={category.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <Link
              href={`/tags/${category.slug}`}
              className="group block relative p-5 rounded-2xl bg-surface-100/80 backdrop-blur-sm border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
            >
              {/* Hover glow effect */}
              <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl`} />

              <div className="relative">
                {/* Icon with gradient background */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <CategoryIcon icon={category.icon} className="w-6 h-6 text-white" />
                </div>

                {/* Category name */}
                <div className="font-semibold text-platinum-100 group-hover:text-white transition-colors mb-1">
                  {category.name}
                </div>

                {/* Server count */}
                <div className="flex items-center gap-1.5 text-xs text-platinum-500">
                  <span className="w-1 h-1 rounded-full bg-platinum-500/50" />
                  {category.count} servers
                </div>
              </div>

              {/* Arrow indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-platinum-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
