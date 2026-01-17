"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import TagCard from "@/components/ui/TagCard";
import { TAG_CATEGORIES } from "@/lib/data";
import { getTagCounts, getServerCount } from "@/lib/supabase/queries";

export default function TagsPage() {
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [totalServers, setTotalServers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [counts, total] = await Promise.all([
        getTagCounts(),
        getServerCount(),
      ]);
      setTagCounts(counts);
      setTotalServers(total);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  // Merge static tag info with dynamic counts
  const tagsWithCounts = TAG_CATEGORIES.map((tag) => ({
    ...tag,
    serverCount: tagCounts[tag.name] || 0,
  }));

  // Sort by server count (most popular first)
  const sortedTags = [...tagsWithCounts].sort((a, b) => b.serverCount - a.serverCount);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="badge-purple">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Categories
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
          Browse by Category
        </h1>
        <p className="text-lg text-white/50">
          Find servers that match your playstyle
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="card p-5 mb-8 flex flex-wrap items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-hytale-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-hytale-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <span className="text-white/50 text-sm">
            <span className="text-hytale-400 font-semibold">{sortedTags.length}</span> categories
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-forest-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span className="text-white/50 text-sm">
            <span className="text-white/70 font-semibold">{totalServers}</span> total servers
          </span>
        </div>
      </motion.div>

      {/* Tags Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {isLoading ? (
          // Loading skeleton
          [...Array(10)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-6 w-24 bg-white/10 rounded mb-3" />
              <div className="h-4 w-full bg-white/5 rounded mb-2" />
              <div className="h-4 w-2/3 bg-white/5 rounded" />
            </div>
          ))
        ) : (
          sortedTags.map((tag, index) => (
            <TagCard key={tag.slug} tag={tag} index={index} />
          ))
        )}
      </motion.div>

      {/* Popular Combinations */}
      <motion.div
        className="mt-14"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="badge-gold">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Popular
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white">Popular Combinations</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            ["SMP", "Economy"],
            ["PvP", "Factions"],
            ["RPG", "Adventure"],
            ["Survival", "Hardcore"],
            ["Minigames", "PvP"],
            ["Creative", "SMP"],
          ].map((combo, index) => (
            <motion.div
              key={combo.join("-")}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
            >
              <Link
                href={`/rankings?tags=${combo.join(",")}`}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-night-800/60 border border-white/5 hover:border-white/10 hover:bg-night-700/60 transition-all duration-200"
              >
                {combo.map((tag, i) => (
                  <span key={tag} className="flex items-center">
                    {i > 0 && <span className="text-white/30 mr-2">+</span>}
                    <span className="text-white/60 group-hover:text-white transition-colors">{tag}</span>
                  </span>
                ))}
                <svg
                  className="w-4 h-4 text-white/30 ml-1 group-hover:text-hytale-400 group-hover:translate-x-1 transition-all"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
