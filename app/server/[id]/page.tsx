"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import ServerCard from "@/components/ServerCard";
import StatusBadge from "@/components/server/StatusBadge";
import StarRating from "@/components/ui/StarRating";
import PlayerGraph from "@/components/server/PlayerGraph";
import VoteTrends from "@/components/server/VoteTrends";
import UptimeTracker from "@/components/server/UptimeTracker";
import ReviewsSection from "@/components/server/ReviewsSection";
import { getServerById, getServers, incrementViewCount, type Server } from "@/lib/supabase/queries";
import { useVote } from "@/lib/hooks/useVote";

export default function ServerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [copied, setCopied] = useState(false);
  const [server, setServer] = useState<Server | null>(null);
  const [similarServers, setSimilarServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  const { canVote, isVoting, countdown, vote, isLoading: voteLoading } = useVote(id);

  useEffect(() => {
    async function fetchServer() {
      setLoading(true);
      const data = await getServerById(id);
      setServer(data);

      if (data) {
        // Track view
        incrementViewCount(id);

        // Fetch similar servers (same tags)
        const { servers } = await getServers({ limit: 20 });
        const similar = servers
          .filter((s) => s.id !== data.id && s.tags.some((t) => data.tags.includes(t)))
          .slice(0, 3);
        setSimilarServers(similar);
      }

      setLoading(false);
    }

    fetchServer();
  }, [id]);

  const handleCopyIP = async () => {
    if (!server) return;
    try {
      await navigator.clipboard.writeText(server.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy IP:", err);
    }
  };

  const handleVote = async () => {
    const result = await vote();
    if (!result.success) {
      console.log("Vote failed:", result.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-64 bg-night-800/50 rounded-2xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="h-96 bg-night-800/50 rounded-2xl" />
            </div>
            <div className="h-96 bg-night-800/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <motion.div
          className="p-16 rounded-2xl bg-night-900/50 backdrop-blur-xl border border-white/[0.06] text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-white/30 mb-5">
            <svg className="w-20 h-20 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Server Not Found</h2>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            The server you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-hytale-500 text-white font-semibold rounded-xl hover:bg-hytale-400 transition-colors shadow-lg shadow-hytale-500/25"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Servers
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
      {/* Breadcrumb */}
      <motion.div
        className="flex items-center gap-2 text-sm text-white/40 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Link href="/" className="hover:text-white/70 transition-colors">
          Home
        </Link>
        <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <Link href="/rankings" className="hover:text-white/70 transition-colors">
          Servers
        </Link>
        <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-white/60 truncate">{server.name}</span>
      </motion.div>

      {/* Banner */}
      <motion.div
        className="relative aspect-[21/9] rounded-2xl overflow-hidden mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src={server.banner}
          alt={server.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/50 to-transparent" />

        {/* Badges on banner */}
        <div className="absolute top-4 left-4 flex gap-2">
          {server.featured && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gold-500 to-amber-500 text-white text-sm font-bold shadow-lg shadow-gold-500/30">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Featured
            </div>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-night-800/90 backdrop-blur-sm text-white text-sm font-bold border border-white/[0.08]">
            #{server.rank}
          </div>
        </div>

        {server.verified && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/90 text-white text-sm font-semibold shadow-lg">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Verified
            </div>
          </div>
        )}
      </motion.div>

      {/* Server Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main Info */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="p-6 rounded-2xl bg-night-900/50 backdrop-blur-xl border border-white/[0.06]">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3">
              {server.name}
            </h1>
            <p className="text-white/50 mb-6 leading-relaxed">
              {server.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {server.tags.map((tag) => (
                <Link key={tag} href={`/tags/${tag.toLowerCase()}`}>
                  <span className="px-3 py-1.5 rounded-lg bg-night-800/60 text-white/60 text-sm font-medium border border-white/[0.04] hover:bg-night-700/60 hover:border-white/[0.08] cursor-pointer transition-all">
                    {tag}
                  </span>
                </Link>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyIP}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-hytale-500 hover:bg-hytale-400 text-white shadow-lg shadow-hytale-500/25"
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy IP
                  </>
                )}
              </button>

              <button
                onClick={handleVote}
                disabled={!canVote || isVoting || voteLoading}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  !canVote
                    ? "bg-gold-500 text-night-950 shadow-lg shadow-gold-500/25"
                    : isVoting
                    ? "bg-night-800/60 text-white/40 cursor-wait"
                    : "bg-night-800/60 border border-white/[0.06] text-white/70 hover:bg-night-700/60 hover:border-white/[0.12]"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={!canVote ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                {isVoting ? "Voting..." : !canVote ? (countdown ? `Vote in ${countdown}` : "Voted!") : "Vote"}
              </button>

              {server.website && (
                <a
                  href={server.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold bg-night-800/60 border border-white/[0.06] text-white/70 hover:bg-night-700/60 hover:border-white/[0.12] transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  Website
                </a>
              )}

              {server.discord && (
                <a
                  href={server.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-semibold bg-[#5865F2]/15 border border-[#5865F2]/25 text-[#5865F2] hover:bg-[#5865F2]/25 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Discord
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="p-6 rounded-2xl bg-night-900/50 backdrop-blur-xl border border-white/[0.06] space-y-6">
            {/* Server Status */}
            <div>
              <div className="text-white/40 text-sm font-medium mb-2">Server Status</div>
              <div className="flex items-center justify-between">
                <StatusBadge
                  status={server.status}
                  latency={server.latency}
                  showLatency={true}
                  size="lg"
                />
              </div>
            </div>

            {/* Players */}
            <div>
              <div className="text-white/40 text-sm font-medium mb-2">Players Online</div>
              <div className="text-3xl font-bold text-white">
                {server.players.online.toLocaleString()}
                <span className="text-lg text-white/40 font-normal">
                  {" "}/ {server.players.max.toLocaleString()}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-night-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-hytale-500 to-crystal-500 rounded-full transition-all"
                  style={{ width: `${Math.min((server.players.online / server.players.max) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Uptime */}
            <div>
              <div className="text-white/40 text-sm font-medium mb-2">Uptime</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-night-800/60 rounded-xl">
                  <div className={`text-lg font-bold ${
                    server.uptime?.day !== null && server.uptime?.day !== undefined
                      ? server.uptime.day >= 99 ? "text-emerald-400"
                      : server.uptime.day >= 95 ? "text-hytale-400"
                      : "text-yellow-400"
                      : "text-white/30"
                  }`}>
                    {server.uptime?.day?.toFixed(1) ?? "—"}%
                  </div>
                  <div className="text-xs text-white/40">24h</div>
                </div>
                <div className="text-center p-3 bg-night-800/60 rounded-xl">
                  <div className={`text-lg font-bold ${
                    server.uptime?.week !== null && server.uptime?.week !== undefined
                      ? server.uptime.week >= 99 ? "text-emerald-400"
                      : server.uptime.week >= 95 ? "text-hytale-400"
                      : "text-yellow-400"
                      : "text-white/30"
                  }`}>
                    {server.uptime?.week?.toFixed(1) ?? "—"}%
                  </div>
                  <div className="text-xs text-white/40">7d</div>
                </div>
                <div className="text-center p-3 bg-night-800/60 rounded-xl">
                  <div className={`text-lg font-bold ${
                    server.uptime?.month !== null && server.uptime?.month !== undefined
                      ? server.uptime.month >= 99 ? "text-emerald-400"
                      : server.uptime.month >= 95 ? "text-hytale-400"
                      : "text-yellow-400"
                      : "text-white/30"
                  }`}>
                    {server.uptime?.month?.toFixed(1) ?? "—"}%
                  </div>
                  <div className="text-xs text-white/40">30d</div>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div>
              <div className="text-white/40 text-sm font-medium mb-2">Rating</div>
              <div className="flex items-center gap-3">
                <StarRating
                  rating={server.rating?.average ?? 0}
                  size="md"
                  showValue={true}
                  reviewCount={server.rating?.count ?? 0}
                />
              </div>
            </div>

            {/* Votes */}
            <div>
              <div className="text-white/40 text-sm font-medium mb-2">Votes</div>
              <div className="text-3xl font-bold text-white">
                {(server.votes + (!canVote ? 1 : 0)).toLocaleString()}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm">
                <span className="text-hytale-400">
                  +{server.monthlyVotes?.toLocaleString() ?? 0}/mo
                </span>
                <span className="text-white/40">
                  +{server.weeklyVotes?.toLocaleString() ?? 0}/wk
                </span>
              </div>
            </div>

            {/* Server IP */}
            <div>
              <div className="text-white/40 text-sm font-medium mb-2">Server Address</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 bg-night-800/60 rounded-xl text-white/70 font-mono text-sm border border-white/[0.04]">
                  {server.ip}
                </code>
                <button
                  onClick={handleCopyIP}
                  className="p-2.5 rounded-xl bg-night-800/60 hover:bg-night-700/60 text-white/50 hover:text-white/70 border border-white/[0.04] hover:border-white/[0.08] transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Created Date */}
            <div>
              <div className="text-white/40 text-sm font-medium mb-2">Listed Since</div>
              <div className="text-white/70">
                {new Date(server.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Analytics Charts */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="px-2.5 py-1 rounded-lg bg-hytale-500/10 border border-hytale-500/20 text-hytale-400 text-xs font-semibold uppercase tracking-wider">
            Analytics
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white">Server Statistics</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlayerGraph data={[]} />
          <VoteTrends data={[]} />
        </div>
        <div className="mt-6">
          <UptimeTracker
            uptimeDay={server.uptime?.day ?? null}
            uptimeWeek={server.uptime?.week ?? null}
            uptimeMonth={server.uptime?.month ?? null}
          />
        </div>
      </motion.div>

      {/* Reviews Section */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="px-2.5 py-1 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-semibold uppercase tracking-wider">
            Community
          </span>
          <h2 className="text-xl lg:text-2xl font-bold text-white">Player Reviews</h2>
          {server.rating?.count > 0 && (
            <span className="ml-auto text-sm text-white/40">
              {server.rating.count} reviews
            </span>
          )}
        </div>
        <ReviewsSection serverId={id} />
      </motion.div>

      {/* Similar Servers */}
      {similarServers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                Discover
              </span>
              <h2 className="text-xl lg:text-2xl font-bold text-white">Similar Servers</h2>
            </div>
            <Link
              href="/rankings"
              className="group flex items-center gap-2 text-sm font-medium text-white/50 hover:text-hytale-400 transition-colors"
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {similarServers.map((similarServer, index) => (
              <motion.div
                key={similarServer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              >
                <ServerCard server={similarServer} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
