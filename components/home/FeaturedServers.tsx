"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface FeaturedServer {
  id: string;
  name: string;
  description: string;
  ip: string;
  banner_url?: string;
  players_online?: number;
  total_votes: number;
  rank: number;
  tags?: string[];
  status?: "online" | "offline" | "unknown";
}

interface FeaturedServersProps {
  servers: FeaturedServer[];
}

export default function FeaturedServers({ servers }: FeaturedServersProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-rotate featured servers
  useEffect(() => {
    if (isPaused || servers.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % servers.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, servers.length]);

  if (!servers.length) return null;

  const activeServer = servers[activeIndex];
  const otherServers = servers.filter((_, i) => i !== activeIndex).slice(0, 2);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <motion.div
              className="flex items-center gap-2 mb-3"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="badge-gold">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Spotlight
              </span>
            </motion.div>
            <motion.h2
              className="text-2xl lg:text-3xl font-bold text-white"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Featured Servers
            </motion.h2>
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveIndex((prev) => (prev - 1 + servers.length) % servers.length)}
              className="btn-ghost p-2.5 rounded-xl"
              aria-label="Previous server"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev + 1) % servers.length)}
              className="btn-ghost p-2.5 rounded-xl"
              aria-label="Next server"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Featured grid */}
        <div
          className="grid lg:grid-cols-3 gap-6"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Main featured card */}
          <motion.div
            className="lg:col-span-2 relative overflow-hidden rounded-2xl card-premium"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Gold glow effect */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-gold-500/30 via-transparent to-gold-500/10 opacity-60 pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeServer.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {/* Banner */}
                <div className="relative h-48 lg:h-64 overflow-hidden">
                  {activeServer.banner_url ? (
                    <Image
                      src={activeServer.banner_url}
                      alt={activeServer.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-night-800 to-night-900" />
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/50 to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-night-950 text-sm font-bold shadow-lg shadow-gold-500/30">
                      #{activeServer.rank}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-gold-500/20 backdrop-blur-sm border border-gold-500/30 text-gold-300 text-xs font-semibold">
                      FEATURED
                    </span>
                  </div>

                  {/* Status */}
                  <div className="absolute top-4 right-4">
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-night-800/80 backdrop-blur-sm border border-white/10">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-500" />
                      </span>
                      <span className="text-sm font-medium text-white/80">
                        {activeServer.players_online?.toLocaleString() || "—"} online
                      </span>
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="relative p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {activeServer.name}
                  </h3>
                  <p className="text-white/50 mb-4 line-clamp-2">
                    {activeServer.description}
                  </p>

                  {/* Tags */}
                  {activeServer.tags && activeServer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {activeServer.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="badge-teal">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/server/${activeServer.id}`}
                      className="btn-premium flex-1"
                    >
                      View Server
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                      </svg>
                    </Link>

                    <button
                      onClick={() => copyToClipboard(activeServer.ip)}
                      className="btn-secondary"
                    >
                      <span className="font-mono text-sm">{activeServer.ip}</span>
                      {copied ? (
                        <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Side cards */}
          <div className="space-y-6">
            {otherServers.map((server, index) => (
              <motion.div
                key={server.id}
                className="relative overflow-hidden rounded-2xl card card-hover cursor-pointer"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveIndex(servers.findIndex((s) => s.id === server.id))}
              >
                {/* Banner */}
                <div className="relative h-24 overflow-hidden">
                  {server.banner_url ? (
                    <Image
                      src={server.banner_url}
                      alt={server.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-night-800 to-night-850" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-night-900 to-transparent" />

                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-night-800/80 backdrop-blur-sm text-xs font-bold text-white/80 border border-white/10">
                    #{server.rank}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h4 className="font-semibold text-white mb-1 group-hover:text-hytale-400 transition-colors">
                    {server.name}
                  </h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-forest-500" />
                      {server.players_online?.toLocaleString() || "—"} online
                    </span>
                    <span className="text-white/40">
                      {server.total_votes.toLocaleString()} votes
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* View all button */}
            <Link
              href="/rankings?featured=true"
              className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-night-800/30 border border-dashed border-white/10 text-white/50 hover:text-hytale-400 hover:bg-night-800/50 hover:border-hytale-500/30 transition-all"
            >
              <span className="font-medium">View All Featured</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {servers.slice(0, 5).map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-8 bg-gold-500"
                  : "w-1.5 bg-night-700 hover:bg-night-600"
              }`}
              aria-label={`Go to server ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
