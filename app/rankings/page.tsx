"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import ServerListItem from "@/components/server/ServerListItem";
import ServerCard from "@/components/ServerCard";
import { ServerListItemSkeleton, ServerCardSkeleton } from "@/components/ui/Skeleton";
import { getServers, getServerCount, type Server } from "@/lib/supabase/queries";
import type { SortOption } from "@/lib/types";

type ViewMode = "list" | "grid";

const SERVERS_PER_PAGE = 10;

const ALL_TAGS = [
  "SMP",
  "RPG",
  "Minigames",
  "Factions",
  "Creative",
  "PvP",
  "Economy",
  "Survival",
  "Adventure",
  "Hardcore",
];

export default function RankingsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [servers, setServers] = useState<Server[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Fetch servers
  useEffect(() => {
    async function fetchServers() {
      setIsLoading(true);
      const [{ servers: data }, count] = await Promise.all([
        getServers({ limit: 100 }),
        getServerCount(),
      ]);
      setServers(data);
      setTotalCount(count);
      setIsLoading(false);
    }

    fetchServers();
  }, []);

  // Filter and sort servers
  const filteredServers = useMemo(() => {
    let result = [...servers];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower) ||
          s.ip.toLowerCase().includes(searchLower)
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter((s) =>
        selectedTags.some((tag) => s.tags.includes(tag))
      );
    }

    if (verifiedOnly) {
      result = result.filter((s) => s.verified);
    }

    result.sort((a, b) => {
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

    return result;
  }, [servers, search, selectedTags, verifiedOnly, sortBy]);

  const totalPages = Math.ceil(filteredServers.length / SERVERS_PER_PAGE);
  const paginatedServers = filteredServers.slice(
    (currentPage - 1) * SERVERS_PER_PAGE,
    currentPage * SERVERS_PER_PAGE
  );

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setVerifiedOnly(false);
    setCurrentPage(1);
  };

  const hasActiveFilters = search || selectedTags.length > 0 || verifiedOnly;

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
          <span className="badge-teal">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            Rankings
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
          Server Rankings
        </h1>
        <p className="text-lg text-white/50">
          Browse and compare all {totalCount} servers in the Hytale universe
        </p>
      </motion.div>

      {/* Filters Bar */}
      <motion.div
        className="card p-5 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search servers by name, IP, or description..."
                className="input pl-12"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm shrink-0">Sort by:</span>
            <select
              className="input py-2.5 w-auto"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="rank">Rank</option>
              <option value="players">Players Online</option>
              <option value="votes">Most Votes</option>
              <option value="newest">Newest</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Verified Toggle */}
          <button
            onClick={() => {
              setVerifiedOnly(!verifiedOnly);
              setCurrentPage(1);
            }}
            className={`btn ${
              verifiedOnly
                ? "bg-hytale-500/15 border-hytale-500/30 text-hytale-400"
                : "btn-secondary"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Verified Only
          </button>
        </div>

        {/* Tags Filter */}
        <div className="mt-5 pt-5 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-sm font-medium">Filter by category:</span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-hytale-400 hover:text-hytale-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedTags.includes(tag)
                    ? "bg-hytale-500 text-white shadow-lg shadow-hytale-500/25"
                    : "bg-night-800/60 text-white/60 border border-white/5 hover:text-white hover:bg-night-700/60 hover:border-white/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Results Count & View Toggle */}
      <motion.div
        className="flex items-center justify-between mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <p className="text-white/40 text-sm">
          Showing <span className="text-white/70 font-medium">{paginatedServers.length}</span> of{" "}
          <span className="text-white/70 font-medium">{filteredServers.length}</span> servers
          {hasActiveFilters && (
            <span className="ml-2 badge-teal">filtered</span>
          )}
        </p>
        <div className="flex items-center gap-4">
          {totalPages > 1 && (
            <p className="text-white/40 text-sm">
              Page <span className="text-white/70 font-medium">{currentPage}</span> of{" "}
              <span className="text-white/70 font-medium">{totalPages}</span>
            </p>
          )}
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-100/80 border border-white/[0.04]">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-hytale-500/15 text-hytale-400"
                  : "text-white/40 hover:text-white/70"
              }`}
              title="List view"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-hytale-500/15 text-hytale-400"
                  : "text-white/40 hover:text-white/70"
              }`}
              title="Grid view"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Server List / Grid */}
      {viewMode === "list" ? (
        <div className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => <ServerListItemSkeleton key={i} />)
          ) : paginatedServers.length > 0 ? (
            paginatedServers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
              >
                <ServerListItem server={server} index={index} />
              </motion.div>
            ))
          ) : (
            <motion.div
              className="card p-16 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-white/20 mb-5">
                <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                No servers found
              </h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto">
                We couldn&apos;t find any servers matching your criteria. Try adjusting your filters or search query.
              </p>
              <button
                onClick={handleClearFilters}
                className="btn-primary"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Clear All Filters
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => <ServerCardSkeleton key={i} />)
          ) : paginatedServers.length > 0 ? (
            paginatedServers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
              >
                <ServerCard server={server} />
              </motion.div>
            ))
          ) : (
            <motion.div
              className="col-span-full card p-16 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-white/20 mb-5">
                <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                No servers found
              </h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto">
                We couldn&apos;t find any servers matching your criteria. Try adjusting your filters or search query.
              </p>
              <button
                onClick={handleClearFilters}
                className="btn-primary"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Clear All Filters
              </button>
            </motion.div>
          )}
        </div>
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
    </div>
  );
}
