"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { Server } from "@/lib/supabase/queries";

interface FeaturedServerCardProps {
  server: Server;
  index: number;
}

export default function FeaturedServerCard({ server, index }: FeaturedServerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
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

  const formatPlayers = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/server/${server.id}`}>
        <motion.div
          className="glass-card overflow-hidden cursor-pointer group min-w-[280px] lg:min-w-[320px] border-legendary-500/20"
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Featured Banner Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-legendary-500/10 via-transparent to-adventure-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Banner */}
          <div className="relative aspect-[16/10] overflow-hidden">
            <motion.div
              className="absolute inset-0"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Image
                src={server.banner}
                alt={server.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 280px, 320px"
              />
            </motion.div>

            {/* Featured Badge */}
            <div className="absolute top-3 left-3 z-10">
              <Badge variant="gold" size="sm">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                Featured
              </Badge>
            </div>

            {/* Verified Badge */}
            {server.verified && (
              <div className="absolute top-3 right-3 z-10">
                <Badge variant="green" size="sm">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  Verified
                </Badge>
              </div>
            )}

            {/* Player Count Pill */}
            <div className="absolute bottom-3 right-3 z-10">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-void-950/80 backdrop-blur-sm text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-adventure-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-adventure-500" />
                </span>
                <span className="text-adventure-400 font-medium">
                  {formatPlayers(server.players.online)}
                </span>
              </div>
            </div>

            {/* Copy IP Overlay */}
            <motion.div
              className="absolute inset-0 bg-void-950/60 backdrop-blur-sm flex items-center justify-center z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handleCopyIP}
                className="px-4 py-2 bg-adventure-500 hover:bg-adventure-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy IP
                  </>
                )}
              </button>
            </motion.div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-void-950/90 via-void-950/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="p-4 relative">
            <h3 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-legendary-400 transition-colors">
              {server.name}
            </h3>
            <p className="text-white/50 text-sm mb-3 line-clamp-1">
              {server.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {server.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
              {server.tags.length > 2 && (
                <Badge variant="default" size="sm">
                  +{server.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
