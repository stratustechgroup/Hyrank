"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Server } from "@/lib/supabase/queries";

interface DailyMetric {
  date: string;
  votes: number;
  views: number;
  players: number;
}

interface ServerAnalyticsPanelProps {
  server: Server;
  metrics: DailyMetric[];
  index?: number;
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 120;
  const height = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="opacity-70">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ServerAnalyticsPanel({
  server,
  metrics,
  index = 0,
}: ServerAnalyticsPanelProps) {
  const hasData = metrics.length > 0;

  const totalVotes = metrics.reduce((s, m) => s + m.votes, 0);
  const totalViews = metrics.reduce((s, m) => s + m.views, 0);
  const avgPlayers =
    metrics.length > 0
      ? Math.round(metrics.reduce((s, m) => s + m.players, 0) / metrics.length)
      : 0;

  const voteSeries = metrics.map((m) => m.votes);
  const viewSeries = metrics.map((m) => m.views);
  const playerSeries = metrics.map((m) => m.players);

  return (
    <motion.div
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      {/* Server header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              server.status === "online"
                ? "bg-forest-500 shadow-[0_0_8px] shadow-forest-500/60"
                : server.status === "offline"
                  ? "bg-crimson-500"
                  : "bg-platinum-500"
            }`}
          />
          <h3 className="text-white font-semibold">{server.name}</h3>
          <span className="text-white/30 text-sm font-mono">{server.ip}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/server/${server.id}`}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="View server page"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
          <Link
            href={`/server/${server.id}/claim`}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Claim settings"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </Link>
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-3 divide-x divide-white/5">
          {/* Votes */}
          <div className="p-5">
            <div className="text-white/40 text-xs mb-1">Votes (14d)</div>
            <div className="text-2xl font-bold text-white mb-1">{totalVotes.toLocaleString()}</div>
            <SparkLine data={voteSeries} color="#00e6b8" />
          </div>

          {/* Views */}
          <div className="p-5">
            <div className="text-white/40 text-xs mb-1">Views (14d)</div>
            <div className="text-2xl font-bold text-white mb-1">{totalViews.toLocaleString()}</div>
            <SparkLine data={viewSeries} color="#a855f7" />
          </div>

          {/* Players */}
          <div className="p-5">
            <div className="text-white/40 text-xs mb-1">Avg Players (7d)</div>
            <div className="text-2xl font-bold text-white mb-1">
              {avgPlayers.toLocaleString()}
            </div>
            <SparkLine data={playerSeries} color="#fb923c" />
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="px-6 py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <p className="text-white/40 text-sm mb-1">No analytics data yet</p>
          <p className="text-white/25 text-xs max-w-xs mx-auto">
            Analytics populate as players visit and vote for your server.{" "}
            <a
              href="#"
              className="text-hytale-400/60 hover:text-hytale-400 transition-colors"
            >
              Install the HyRank Vote Plugin
            </a>{" "}
            to unlock detailed vote-source analytics.
          </p>
        </div>
      )}
    </motion.div>
  );
}
