"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Server } from "@/lib/supabase/queries";
import TrustTierBadge from "@/components/server/TrustTierBadge";

interface ServerCardProps {
  server: Server;
  onCopyIP?: (ip: string) => void;
}

// Rank badge component
function RankBadge({ rank }: { rank: number }) {
  const isTop3 = rank <= 3;
  const colors = {
    1: "from-gold-400 to-gold-600 text-night-950 shadow-gold-500/30",
    2: "from-platinum-300 to-platinum-400 text-night-950 shadow-platinum-400/30",
    3: "from-ember-400 to-ember-600 text-night-950 shadow-ember-500/30",
  };

  if (isTop3) {
    return (
      <div className={`px-3 py-1.5 rounded-xl font-bold text-sm bg-gradient-to-br ${colors[rank as 1 | 2 | 3]} shadow-lg`}>
        #{rank}
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 rounded-xl font-bold text-sm bg-night-800/80 backdrop-blur-sm text-white/80 border border-white/10">
      #{rank}
    </div>
  );
}

// Featured badge with glow
function FeaturedBadge() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-night-950 font-bold text-xs shadow-lg shadow-gold-500/30">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span>Featured</span>
    </div>
  );
}

export default function ServerCard({ server, onCopyIP }: ServerCardProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopyIP = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(server.ip);
      setCopied(true);
      onCopyIP?.(server.ip);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy IP:", err);
    }
  };

  const formatPlayers = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const isPremiumCard = server.featured || server.isPremium;

  return (
    <Link href={`/server/${server.id}`}>
      <motion.div
        className="server-card h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{
          y: -4,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
      >
        {/* Premium border glow */}
        {isPremiumCard && (
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-gold-500/40 via-transparent to-gold-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}

        {/* Banner Image */}
        <div className="server-card-banner">
          <motion.div
            className="absolute inset-0"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Image
              src={server.banner}
              alt={server.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </motion.div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/40 to-transparent pointer-events-none" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            {server.featured ? (
              <FeaturedBadge />
            ) : (
              <RankBadge rank={server.rank} />
            )}
            {server.verified && (
              <div className="px-2 py-1 rounded-lg bg-hytale-500/20 backdrop-blur-sm text-hytale-400 text-xs font-medium border border-hytale-500/30">
                Verified
              </div>
            )}
            <TrustTierBadge tier={(server as unknown as { trust_tier?: string | null }).trust_tier} />
          </div>

          {/* Status badge */}
          <div className="absolute top-3 right-3 z-10">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-xl border ${
              server.status === "online"
                ? "bg-forest-500/15 border-forest-500/25 text-forest-400"
                : "bg-crimson-500/15 border-crimson-500/25 text-crimson-400"
            }`}>
              <span className="relative flex h-2 w-2">
                {server.status === "online" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  server.status === "online" ? "bg-forest-500" : "bg-crimson-500"
                }`} />
              </span>
              <span className="text-xs font-medium">
                {server.status === "online"
                  ? `${formatPlayers(server.players.online)} playing`
                  : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="server-card-content">
          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-hytale-400 transition-colors">
            {server.name}
          </h3>

          {/* Description */}
          <p className="text-white/50 text-sm mb-4 line-clamp-2">
            {server.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {server.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="badge-teal"
              >
                {tag}
              </span>
            ))}
            {server.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-white/40">
                +{server.tags.length - 3} more
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-white/50 mb-4">
            {server.rating && server.rating.count > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-gold-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-white/70 font-medium">{server.rating.average.toFixed(1)}</span>
                <span>({server.rating.count})</span>
              </div>
            )}
            {server.uptime?.month && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span>{server.uptime.month}%</span>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span className="text-white/70 font-medium">{server.votes.toLocaleString()}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="server-ip">
            <button
              onClick={handleCopyIP}
              className="flex items-center gap-2 flex-1 overflow-hidden"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-forest-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-forest-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-hytale-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span className="truncate">{server.ip}</span>
                </>
              )}
            </button>

            {/* Vote button */}
            <motion.button
              onClick={(e) => e.preventDefault()}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-hytale-500/15 text-hytale-400 font-medium text-xs border border-hytale-500/25 hover:bg-hytale-500/25 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Vote
            </motion.button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
