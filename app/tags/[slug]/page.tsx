"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import ServerCard from "@/components/ServerCard";
import { ServerCardSkeleton } from "@/components/ui/Skeleton";
import { TAG_CATEGORIES } from "@/lib/data";
import { getServersByTag, type Server } from "@/lib/supabase/queries";
import type { SortOption } from "@/lib/types";

const SERVERS_PER_PAGE = 9;

export default function TagDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const [currentPage, setCurrentPage] = useState(1);
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Find the tag category
  const tagCategory = TAG_CATEGORIES.find((t) => t.slug === slug);
  const tagName = tagCategory?.name || slug;

  // Fetch servers by tag
  useEffect(() => {
    async function fetchServers() {
      setIsLoading(true);
      const data = await getServersByTag(tagName);
      setServers(data);
      setIsLoading(false);
    }
    fetchServers();
  }, [tagName]);

  // Sort servers
  const sortedServers = useMemo(() => {
    return [...servers].sort((a, b) => {
      switch (sortBy) {
        case "players":
          return b.players.online - a.players.online;
        case "votes":
          return b.votes - a.votes;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return a.rank - b.rank;
      }
    });
  }, [servers, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedServers.length / SERVERS_PER_PAGE);
  const paginatedServers = sortedServers.slice(
    (currentPage - 1) * SERVERS_PER_PAGE,
    currentPage * SERVERS_PER_PAGE
  );

  if (!tagCategory) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <motion.div
          className="card p-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-white/30 mb-5">
            <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Tag Not Found</h2>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            The tag &quot;{slug}&quot; doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/tags"
            className="btn-primary"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Tags
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
      {/* Breadcrumb */}
      <motion.div
        className="flex items-center gap-2 text-sm text-white/50 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <Link href="/tags" className="hover:text-white transition-colors">
          Tags
        </Link>
        <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-white/70">{tagCategory.name}</span>
      </motion.div>

      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-hytale-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-hytale-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">
            {tagCategory.name}
          </h1>
        </div>
        <p className="text-lg text-white/50">
          {tagCategory.description}
        </p>
      </motion.div>

      {/* Stats & Sort Bar */}
      <motion.div
        className="card p-5 mb-8 flex flex-wrap items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hytale-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-hytale-500" />
          </span>
          <span className="text-white/50 text-sm">
            <span className="text-hytale-400 font-semibold">{servers.length}</span> servers with this tag
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm shrink-0">Sort by:</span>
          <select
            className="input py-2.5 w-auto"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
              setCurrentPage(1);
            }}
          >
            <option value="rank">Rank</option>
            <option value="players">Players Online</option>
            <option value="votes">Most Votes</option>
            <option value="newest">Newest</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </motion.div>

      {/* Server Grid */}
      {isLoading ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {[...Array(6)].map((_, i) => (
            <ServerCardSkeleton key={i} />
          ))}
        </motion.div>
      ) : paginatedServers.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {paginatedServers.map((server, index) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
            >
              <ServerCard server={server} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="card p-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-white/30 mb-5">
            <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            No servers found
          </h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            There are currently no servers with the {tagCategory.name} tag.
          </p>
          <Link
            href="/rankings"
            className="btn-primary"
          >
            Browse All Servers
          </Link>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          className="flex items-center justify-center gap-2 mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-ghost p-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, i, arr) => {
                const prevPage = arr[i - 1];
                const showEllipsis = prevPage && page - prevPage > 1;

                return (
                  <div key={page} className="flex items-center gap-1.5">
                    {showEllipsis && (
                      <span className="px-2 text-white/30">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl font-medium transition-all ${
                        currentPage === page
                          ? "bg-hytale-500 text-white shadow-lg shadow-hytale-500/25"
                          : "bg-night-800/60 text-white/60 border border-white/5 hover:text-white hover:bg-night-700/60"
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-ghost p-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </motion.div>
      )}

      {/* Related Tags */}
      <motion.div
        className="mt-14"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="badge-green">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            Explore
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white">Related Tags</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {TAG_CATEGORIES.filter((t) => t.slug !== slug)
            .slice(0, 8)
            .map((tag) => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="group px-4 py-2.5 rounded-xl bg-night-800/60 border border-white/5 hover:border-white/10 hover:bg-night-700/60 transition-all text-white/50 hover:text-white flex items-center gap-2"
              >
                {tag.name}
                <svg
                  className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
