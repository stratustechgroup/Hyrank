"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ServerCard from "@/components/ServerCard";
import Footer from "@/components/home/Footer";
import {
  getServers,
  getFeaturedServers,
  getTopVotedServers,
  getRecentServers,
  getTotalPlayers,
  getServerCount,
  getRandomServer,
  type Server,
} from "@/lib/supabase/queries";
import { getCountryFlag } from "@/lib/utils/countries";
import type { SortOption } from "@/lib/types";

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(startValue + (value - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, isInView]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

// Quick filter pills
function QuickFilterPills() {
  const popularTags = ["SMP", "PvP", "RPG", "Minigames", "Economy", "Survival"];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {popularTags.map((tag) => (
        <Link
          key={tag}
          href={`/tags/${tag.toLowerCase()}`}
          className="px-4 py-2 text-sm font-medium text-white/70 bg-night-800/60 hover:bg-night-700/80 border border-white/5 hover:border-white/10 rounded-full transition-all hover:scale-105"
        >
          {tag}
        </Link>
      ))}
      <Link
        href="/tags"
        className="px-4 py-2 text-sm font-medium text-hytale-400 hover:text-hytale-300 bg-hytale-500/10 hover:bg-hytale-500/20 border border-hytale-500/20 rounded-full transition-all"
      >
        All Categories →
      </Link>
    </div>
  );
}

// Hero with animated stats and random server button
function HeroSection({
  serverCount,
  playerCount,
  onRandomServer
}: {
  serverCount: number;
  playerCount: number;
  onRandomServer: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/rankings?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <section className="relative pt-24 pb-12 lg:pt-32 lg:pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          {/* Animated Live Stats */}
          <motion.div
            className="flex items-center justify-center gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-night-800/60 backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hytale-500 to-hytale-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={serverCount} />
                </div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Servers</div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-night-800/60 backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest-500 to-forest-600 flex items-center justify-center relative">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-forest-500"></span>
                </span>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={playerCount} />
                </div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Players Online</div>
              </div>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Find Your Perfect{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-hytale-400 to-crystal-400">
              Hytale Server
            </span>
          </motion.h1>

          <motion.p
            className="text-lg text-white/50 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Discover, compare, and join the best Hytale communities
          </motion.p>

          {/* Search bar with random button */}
          <motion.div
            className="relative max-w-2xl mx-auto mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <form onSubmit={handleSearch} className="relative flex items-center">
              <div className="absolute left-4 text-white/40">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search servers by name, tag, or gamemode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-4 pl-12 pr-44 bg-night-800/60 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-white/40 outline-none focus:border-hytale-500/50 transition-all"
              />
              <div className="absolute right-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRandomServer}
                  className="p-2.5 rounded-xl bg-night-700/60 hover:bg-night-600/80 text-white/60 hover:text-white border border-white/5 transition-all"
                  title="Random Server"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-hytale-500 to-hytale-600 text-white font-semibold rounded-xl hover:from-hytale-400 hover:to-hytale-500 transition-all shadow-lg shadow-hytale-500/25"
                >
                  Search
                </button>
              </div>
            </form>
          </motion.div>

          {/* Quick Filter Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <QuickFilterPills />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Premium Featured Spotlight with gold styling
function PremiumSpotlight({ servers }: { servers: Server[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const featured = servers.slice(0, 4);
  if (featured.length === 0) return null;

  const activeServer = featured[activeIndex];

  const copyIP = async () => {
    await navigator.clipboard.writeText(activeServer.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Premium Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/30">
              <svg className="w-5 h-5 text-night-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Premium Spotlight</h2>
              <p className="text-sm text-white/40">Featured servers with premium status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveIndex((prev) => (prev - 1 + featured.length) % featured.length)}
              className="p-2 rounded-lg bg-night-800/60 hover:bg-night-700/80 text-white/60 hover:text-white border border-white/5 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev + 1) % featured.length)}
              className="p-2 rounded-lg bg-night-800/60 hover:bg-night-700/80 text-white/60 hover:text-white border border-white/5 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Premium Featured Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Hero Card with Gold Border */}
          <motion.div
            key={activeServer.id}
            className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold-500/10 to-transparent border-2 border-gold-500/30 shadow-xl shadow-gold-500/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-500/5 to-transparent -translate-x-full animate-shimmer" />

            {/* Banner */}
            <div className="relative h-56 lg:h-72 overflow-hidden">
              <Image
                src={activeServer.banner}
                alt={activeServer.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/50 to-transparent" />

              {/* Premium Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 text-night-950 text-sm font-bold shadow-lg shadow-gold-500/30 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  PREMIUM
                </span>
                <span className="px-3 py-2 rounded-xl bg-night-800/90 backdrop-blur-sm text-white text-sm font-bold border border-white/10">
                  #{activeServer.rank}
                </span>
              </div>

              {/* Country & Status */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {activeServer.country && (
                  <span className="px-3 py-2 rounded-xl bg-night-800/90 backdrop-blur-sm text-lg border border-white/10">
                    {getCountryFlag(activeServer.country)}
                  </span>
                )}
                <span className="flex items-center gap-2 px-3 py-2 rounded-xl bg-night-800/90 backdrop-blur-sm border border-white/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-500" />
                  </span>
                  <span className="text-sm font-medium text-white/80">
                    {activeServer.players.online.toLocaleString()} online
                  </span>
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-white mb-2">{activeServer.name}</h3>
              <p className="text-white/50 mb-4 line-clamp-2">{activeServer.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {activeServer.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-lg bg-night-800/60 text-white/60 text-sm border border-white/5">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <Link href={`/server/${activeServer.id}`} className="flex-1 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-night-950 font-bold rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/25 flex items-center justify-center gap-2">
                  View Server
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </Link>
                <button onClick={copyIP} className="px-5 py-3 bg-night-800/60 hover:bg-night-700/80 border border-white/10 rounded-xl transition-all flex items-center gap-2">
                  <span className="font-mono text-sm text-white/70">{activeServer.ip}</span>
                  {copied ? (
                    <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Side Cards */}
          <div className="space-y-4">
            {featured.filter((_, i) => i !== activeIndex).slice(0, 2).map((server, index) => (
              <motion.div
                key={server.id}
                className="relative overflow-hidden rounded-xl bg-night-900/50 border border-gold-500/20 hover:border-gold-500/40 cursor-pointer transition-all group"
                onClick={() => setActiveIndex(featured.findIndex((s) => s.id === server.id))}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                <div className="relative h-24 overflow-hidden">
                  <Image src={server.banner} alt={server.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-night-900 to-transparent" />
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg bg-gradient-to-r from-gold-500/80 to-gold-600/80 text-night-950 text-xs font-bold">
                      #{server.rank}
                    </span>
                    {server.country && (
                      <span className="text-sm">{getCountryFlag(server.country)}</span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-gold-400 transition-colors">{server.name}</h4>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-forest-500" />
                      {server.players.online.toLocaleString()} online
                    </span>
                    <span>{server.votes.toLocaleString()} votes</span>
                  </div>
                </div>
              </motion.div>
            ))}

            <Link
              href="/rankings?featured=true"
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-gold-500/5 to-gold-600/5 border border-dashed border-gold-500/30 text-gold-400 hover:text-gold-300 hover:border-gold-500/50 transition-all"
            >
              View All Premium
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {featured.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-8 bg-gold-500" : "w-1.5 bg-night-700 hover:bg-night-600"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Top Voted Leaderboard
function TopVotedLeaderboard({ servers }: { servers: Server[] }) {
  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c1.8 6-3 9-3 14 0 3.2 2.8 6 6 6s6-2.8 6-6C21 8 12 2 12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Top Voted</h2>
              <p className="text-sm text-white/40">Most popular servers this month</p>
            </div>
          </div>
          <Link
            href="/rankings?sort=votes"
            className="group flex items-center gap-2 text-sm font-medium text-white/50 hover:text-hytale-400 transition-colors"
          >
            View Full Rankings
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          {servers.map((server, index) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={`/server/${server.id}`}
                className="group flex items-center gap-4 p-4 rounded-xl bg-night-900/50 border border-white/5 hover:border-hytale-500/30 hover:bg-night-800/50 transition-all"
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  index === 0 ? "bg-gradient-to-br from-gold-400 to-gold-600 text-night-950" :
                  index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-night-950" :
                  index === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                  "bg-night-800 text-white/60 border border-white/10"
                }`}>
                  {index + 1}
                </div>

                {/* Country Flag */}
                {server.country && (
                  <span className="text-xl shrink-0" title={server.country}>
                    {getCountryFlag(server.country)}
                  </span>
                )}

                {/* Server info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate group-hover:text-hytale-400 transition-colors">
                      {server.name}
                    </h3>
                    {server.featured && (
                      <svg className="w-4 h-4 text-gold-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${server.status === "online" ? "bg-forest-500" : "bg-crimson-500"}`} />
                      {server.players.online.toLocaleString()} online
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {server.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-hytale-400">{tag}</span>
                      ))}
                    </span>
                  </div>
                </div>

                {/* Votes */}
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-white">{server.votes.toLocaleString()}</div>
                  <div className="text-xs text-white/40">votes</div>
                </div>

                <svg className="w-5 h-5 text-white/20 group-hover:text-hytale-400 group-hover:translate-x-1 transition-all shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Browse all servers section
function BrowseServers({ servers, sortBy, setSortBy, totalCount }: { servers: Server[]; sortBy: SortOption; setSortBy: (s: SortOption) => void; totalCount: number }) {
  const sortedServers = useMemo(() => {
    return [...servers].sort((a, b) => {
      switch (sortBy) {
        case "players": return b.players.online - a.players.online;
        case "votes": return b.votes - a.votes;
        case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name": return a.name.localeCompare(b.name);
        default: return a.rank - b.rank;
      }
    });
  }, [servers, sortBy]);

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Browse Servers</h2>
            <span className="px-2.5 py-1 text-xs font-medium bg-night-800/60 text-white/50 border border-white/5 rounded-lg">
              {totalCount} servers
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-white/40">Sort:</span>
            <select
              className="bg-night-800/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/70 outline-none focus:border-hytale-500/50 cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="rank">Rank</option>
              <option value="players">Players Online</option>
              <option value="votes">Most Votes</option>
              <option value="newest">Newest</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedServers.slice(0, 9).map((server, index) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
            >
              <ServerCard server={server} />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link
            href="/rankings"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-hytale-500 to-hytale-600 text-white font-semibold rounded-xl shadow-lg shadow-hytale-500/25 hover:shadow-xl hover:shadow-hytale-500/35 transition-all"
          >
            View All {totalCount} Servers
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// Recently added servers
function RecentlyAdded({ servers }: { servers: Server[] }) {
  if (servers.length === 0) return null;

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Recently Added</h2>
              <p className="text-sm text-white/40">New servers to explore</p>
            </div>
          </div>
          <Link
            href="/rankings?sort=newest"
            className="text-sm text-white/50 hover:text-hytale-400 transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {servers.slice(0, 4).map((server, index) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <ServerCard server={server} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="relative pt-24 pb-12 lg:pt-32 lg:pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center gap-6 mb-8">
              <div className="h-20 w-40 bg-night-800/50 rounded-2xl animate-pulse" />
              <div className="h-20 w-40 bg-night-800/50 rounded-2xl animate-pulse" />
            </div>
            <div className="h-16 w-3/4 bg-night-800/50 rounded-xl mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-1/2 bg-night-800/50 rounded-lg mx-auto mb-8 animate-pulse" />
            <div className="h-14 w-full max-w-2xl bg-night-800/50 rounded-2xl mx-auto animate-pulse" />
          </div>
        </div>
      </section>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/40">Loading servers...</div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortOption>("rank");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    serverCount: number;
    playerCount: number;
    featuredServers: Server[];
    topVotedServers: Server[];
    recentServers: Server[];
    allServers: Server[];
  }>({
    serverCount: 0,
    playerCount: 0,
    featuredServers: [],
    topVotedServers: [],
    recentServers: [],
    allServers: [],
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          serverCount,
          playerCount,
          featuredServers,
          topVotedServers,
          recentServers,
          { servers: allServers },
        ] = await Promise.all([
          getServerCount(),
          getTotalPlayers(),
          getFeaturedServers(),
          getTopVotedServers(10),
          getRecentServers(4),
          getServers({ limit: 20 }),
        ]);

        setData({
          serverCount,
          playerCount,
          featuredServers,
          topVotedServers,
          recentServers,
          allServers,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleRandomServer = async () => {
    const randomServer = await getRandomServer();
    if (randomServer) {
      router.push(`/server/${randomServer.id}`);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const nonFeaturedServers = data.allServers.filter((s) => !s.featured);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero with animated stats */}
      <HeroSection
        serverCount={data.serverCount}
        playerCount={data.playerCount}
        onRandomServer={handleRandomServer}
      />

      {/* Premium Featured Spotlight */}
      <PremiumSpotlight servers={data.featuredServers} />

      {/* Top Voted Leaderboard */}
      <TopVotedLeaderboard servers={data.topVotedServers} />

      {/* Recently Added */}
      <RecentlyAdded servers={data.recentServers} />

      {/* Browse All Servers */}
      <BrowseServers
        servers={nonFeaturedServers}
        sortBy={sortBy}
        setSortBy={setSortBy}
        totalCount={data.serverCount}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
