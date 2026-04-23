"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { getCountryFlag, getCountryName } from "@/lib/utils/countries";
import type { Server } from "@/lib/supabase/queries";
import TrustTierBadge from "@/components/server/TrustTierBadge";

interface ServerListItemProps {
  server: Server;
  index: number;
  showVoteButton?: boolean;
}

export default function ServerListItem({ server, index, showVoteButton = true }: ServerListItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyIP = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(server.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy IP:", err);
    }
  };

  const handleVote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Vote functionality - navigates to server page vote section
    window.location.href = `/server/${server.id}?action=vote`;
  };

  const formatPlayers = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-emerald-400";
      case "offline":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "online":
        return "bg-emerald-500/15 border-emerald-500/25";
      case "offline":
        return "bg-red-500/15 border-red-500/25";
      default:
        return "bg-yellow-500/15 border-yellow-500/25";
    }
  };

  const isPremiumRow = server.featured || server.isPremium;

  return (
    <Link href={`/server/${server.id}`}>
      <div
        className={`
          group relative p-4 rounded-xl transition-all duration-200
          bg-surface-100/80 backdrop-blur-sm border
          hover:bg-surface-200/60
          ${isPremiumRow
            ? "border-gold-500/20 hover:border-gold-500/30"
            : "border-white/[0.04] hover:border-white/[0.08]"
          }
        `}
      >
        {/* Premium glow effect */}
        {isPremiumRow && (
          <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-gold-500/10 via-transparent to-gold-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}

        <div className="relative flex items-center gap-4">
          {/* Rank */}
          <div className="w-12 text-center shrink-0">
            {server.featured ? (
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-amber-500 shadow-lg shadow-gold-500/25">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
            ) : (
              <span className="text-2xl font-bold text-platinum-500 group-hover:text-platinum-300 transition-colors">
                #{server.rank}
              </span>
            )}
          </div>

          {/* Server Icon/Banner */}
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative border border-white/[0.06]">
            <Image
              src={server.banner}
              alt={server.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="56px"
            />
          </div>

          {/* Server Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-base font-semibold text-platinum-100 truncate group-hover:text-hytale-400 transition-colors">
                {server.name}
              </h3>
              {/* Country flag */}
              {server.country && (
                <span
                  className="text-base shrink-0"
                  title={getCountryName(server.country)}
                >
                  {getCountryFlag(server.country)}
                </span>
              )}
              {server.verified && (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 shrink-0">
                  <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {server.isPremium && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gold-500/15 text-gold-400 border border-gold-500/20">
                  Premium
                </span>
              )}
              {server.featured && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gold-500/15 text-gold-400 border border-gold-500/20">
                  Featured
                </span>
              )}
              <TrustTierBadge tier={(server as unknown as { trust_tier?: string | null }).trust_tier} />
              {server.badges?.includes("trending") && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/20">
                  Trending
                </span>
              )}
            </div>
            <p className="text-platinum-500 text-sm truncate mb-2">
              {server.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {server.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs font-medium rounded-md bg-surface-300/60 text-platinum-400 border border-white/[0.04]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="hidden lg:flex items-center gap-6 shrink-0">
            {/* Status indicator - improved */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusBg(server.status)}`}>
              <span className="relative flex h-2.5 w-2.5">
                {server.status === "online" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  server.status === "online" ? "bg-emerald-500" :
                  server.status === "offline" ? "bg-red-500" : "bg-yellow-500"
                }`} />
              </span>
              <span className={`text-sm font-medium ${getStatusColor(server.status)}`}>
                {server.status === "online"
                  ? formatPlayers(server.players.online)
                  : server.status === "offline" ? "Offline" : "Unknown"}
              </span>
            </div>

            {/* Uptime */}
            <div className="text-center min-w-[50px]">
              <div className={`font-semibold text-sm ${
                server.uptime?.month !== null && server.uptime?.month !== undefined
                  ? server.uptime.month >= 99 ? "text-emerald-400"
                  : server.uptime.month >= 95 ? "text-hytale-400"
                  : server.uptime.month >= 90 ? "text-yellow-400"
                  : "text-red-400"
                  : "text-platinum-600"
              }`}>
                {server.uptime?.month !== null && server.uptime?.month !== undefined
                  ? `${server.uptime.month.toFixed(1)}%`
                  : "—"}
              </div>
              <span className="text-platinum-600 text-xs">uptime</span>
            </div>

            {/* Rating */}
            <div className="text-center min-w-[50px]">
              <div className="flex items-center justify-center gap-1 text-gold-400 font-semibold text-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {server.rating?.average?.toFixed(1) ?? "—"}
              </div>
              <span className="text-platinum-600 text-xs">
                {server.rating?.count ? `(${server.rating.count})` : "rating"}
              </span>
            </div>

            {/* Votes */}
            <div className="text-center min-w-[60px]">
              <div className="text-platinum-200 font-semibold text-sm">
                {server.votes.toLocaleString()}
              </div>
              <span className="text-platinum-600 text-xs">votes</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Copy IP Button */}
            <button
              onClick={handleCopyIP}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                copied
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : "bg-surface-200/60 border border-white/[0.06] text-platinum-300 hover:text-platinum-100 hover:bg-surface-300/60 hover:border-white/[0.12]"
              }`}
            >
              {copied ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-hytale-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy IP
                </span>
              )}
            </button>

            {/* Inline Vote Button */}
            {showVoteButton && (
              <motion.button
                onClick={handleVote}
                className="px-4 py-2.5 rounded-xl font-medium text-sm bg-hytale-500/15 text-hytale-400 border border-hytale-500/25 hover:bg-hytale-500/25 hover:border-hytale-500/40 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                  Vote
                </span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
