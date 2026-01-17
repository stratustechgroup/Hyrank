"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { getServers, type Server } from "@/lib/supabase/queries";

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "all">("7d");
  const [userServers, setUserServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // In production, this would fetch the user's own servers
  // For now, we'll show the first 3 servers as a demo
  useEffect(() => {
    async function fetchUserServers() {
      setIsLoading(true);
      const { servers } = await getServers({ limit: 3 });
      setUserServers(servers);
      setIsLoading(false);
    }
    fetchUserServers();
  }, []);

  // Calculate aggregate stats
  const totalPlayers = userServers.reduce((sum, s) => sum + s.players.online, 0);
  const totalVotes = userServers.reduce((sum, s) => sum + s.votes, 0);
  const featuredCount = userServers.filter((s) => s.featured).length;

  // Mock analytics data
  const analyticsData = {
    "7d": { views: 12453, votes: 234, clicks: 1823 },
    "30d": { views: 45678, votes: 892, clicks: 6543 },
    all: { views: 123456, votes: 2341, clicks: 18234 },
  };

  const currentAnalytics = analyticsData[selectedPeriod];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-white/60">
          Manage your servers and track performance
        </p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Your Servers</div>
          <div className="text-2xl font-bold text-white">{userServers.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Total Players</div>
          <div className="text-2xl font-bold text-adventure-400 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-adventure-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-adventure-500" />
            </span>
            {totalPlayers.toLocaleString()}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Total Votes</div>
          <div className="text-2xl font-bold text-white">{totalVotes.toLocaleString()}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-white/40 text-sm mb-1">Featured Slots</div>
          <div className="text-2xl font-bold text-legendary-400">{featuredCount}</div>
        </div>
      </motion.div>

      {/* Analytics Card */}
      <motion.div
        className="glass-card p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-white">Analytics Overview</h2>
          <div className="flex items-center gap-2">
            {(["7d", "30d", "all"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? "bg-adventure-500 text-white"
                    : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Page Views
            </div>
            <div className="text-3xl font-bold text-white">
              {currentAnalytics.views.toLocaleString()}
            </div>
            <div className="text-adventure-400 text-sm mt-1">+12% from previous</div>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              Votes Received
            </div>
            <div className="text-3xl font-bold text-white">
              {currentAnalytics.votes.toLocaleString()}
            </div>
            <div className="text-adventure-400 text-sm mt-1">+8% from previous</div>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              IP Copies
            </div>
            <div className="text-3xl font-bold text-white">
              {currentAnalytics.clicks.toLocaleString()}
            </div>
            <div className="text-adventure-400 text-sm mt-1">+15% from previous</div>
          </div>
        </div>
      </motion.div>

      {/* Your Servers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Your Servers</h2>
          <button className="px-4 py-2 bg-adventure-500 hover:bg-adventure-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Server
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-white/10 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 w-48 bg-white/10 rounded mb-2" />
                    <div className="h-4 w-32 bg-white/5 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {userServers.map((server, index) => (
              <motion.div
                key={server.id}
                className="glass-card p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Server Image */}
                  <div className="w-full lg:w-32 h-20 rounded-lg overflow-hidden relative shrink-0">
                    <Image
                      src={server.banner}
                      alt={server.name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>

                  {/* Server Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {server.name}
                      </h3>
                      {server.featured && (
                        <Badge variant="gold" size="sm">Featured</Badge>
                      )}
                      {server.verified && (
                        <Badge variant="green" size="sm">Verified</Badge>
                      )}
                    </div>
                    <p className="text-white/50 text-sm truncate mb-2">{server.ip}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white/40">
                        <span className="text-adventure-400 font-medium">{server.players.online.toLocaleString()}</span> players
                      </span>
                      <span className="text-white/40">
                        <span className="text-white font-medium">{server.votes.toLocaleString()}</span> votes
                      </span>
                      <span className="text-white/40">
                        Rank <span className="text-white font-medium">#{server.rank}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/server/${server.id}`}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title="View Server"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </Link>
                    <button
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit Server"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title="Analytics"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </button>
                    {!server.featured && (
                      <button
                        className="px-3 py-2 rounded-lg bg-legendary-500/20 border border-legendary-500/30 text-legendary-400 hover:bg-legendary-500/30 transition-colors text-sm font-medium"
                        title="Promote to Featured"
                      >
                        Promote
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && userServers.length === 0 && (
          <motion.div
            className="glass-card p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-white/40 mb-4">
              <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No servers yet
            </h3>
            <p className="text-white/50 mb-4">
              Add your first server to start tracking its performance
            </p>
            <button className="px-6 py-3 bg-adventure-500 hover:bg-adventure-600 text-white font-semibold rounded-lg transition-colors">
              Add Your First Server
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-adventure-500/20 flex items-center justify-center text-adventure-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-medium">Apply for Verification</div>
            <div className="text-white/40 text-sm">Get the verified badge</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-legendary-500/20 flex items-center justify-center text-legendary-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-medium">Get Featured</div>
            <div className="text-white/40 text-sm">Boost your visibility</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div>
            <div className="text-white font-medium">Help & Support</div>
            <div className="text-white/40 text-sm">Get assistance</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
