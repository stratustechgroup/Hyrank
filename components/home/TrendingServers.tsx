"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import ServerCard from "@/components/ServerCard";
import type { Server } from "@/lib/supabase/queries";

interface TrendingServersProps {
  servers: Server[];
  title?: string;
  viewAllLink?: string;
}

// Badge variants based on title
const getBadgeConfig = (title: string) => {
  if (title.toLowerCase().includes("trending")) {
    return {
      text: "HOT",
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c1.8 6-3 9-3 14 0 3.2 2.8 6 6 6s6-2.8 6-6C21 8 12 2 12 2zm0 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
        </svg>
      ),
      bgClass: "bg-gradient-to-r from-orange-500/15 to-red-500/15",
      borderClass: "border-orange-500/25",
      textClass: "text-orange-400",
    };
  }
  if (title.toLowerCase().includes("recent") || title.toLowerCase().includes("new")) {
    return {
      text: "NEW",
      icon: (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      bgClass: "bg-gradient-to-r from-hytale-500/15 to-electric-500/15",
      borderClass: "border-hytale-500/25",
      textClass: "text-hytale-400",
    };
  }
  return {
    text: "FEATURED",
    icon: null,
    bgClass: "bg-gold-500/10",
    borderClass: "border-gold-500/20",
    textClass: "text-gold-400",
  };
};

export default function TrendingServers({
  servers,
  title = "Trending Now",
  viewAllLink = "/rankings?sort=trending",
}: TrendingServersProps) {
  const badge = getBadgeConfig(title);

  return (
    <section className="py-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-platinum-100">
            {title}
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${badge.bgClass} ${badge.borderClass} ${badge.textClass}`}
          >
            {badge.icon}
            {badge.text}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href={viewAllLink}
            className="group flex items-center gap-2 text-sm font-medium text-platinum-400 hover:text-hytale-400 transition-colors"
          >
            View All
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
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {servers.slice(0, 4).map((server, index) => (
          <motion.div
            key={server.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <ServerCard server={server} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
