"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface PlayerDataPoint {
  timestamp: string;
  players: number;
}

interface PlayerGraphProps {
  data: PlayerDataPoint[];
  className?: string;
}

type Period = "24h" | "7d" | "30d";

// Generate mock data for demonstration
function generateMockData(period: Period): PlayerDataPoint[] {
  const now = Date.now();
  const data: PlayerDataPoint[] = [];

  let points: number;
  let interval: number;

  switch (period) {
    case "24h":
      points = 24;
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case "7d":
      points = 7 * 24;
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case "30d":
      points = 30;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
  }

  const basePlayerCount = 1000 + Math.random() * 500;

  for (let i = points; i >= 0; i--) {
    const timestamp = new Date(now - i * interval);
    const hour = timestamp.getHours();

    // Simulate daily patterns - more players in evening
    let multiplier = 1;
    if (hour >= 18 && hour <= 23) multiplier = 1.5;
    else if (hour >= 12 && hour <= 17) multiplier = 1.2;
    else if (hour >= 0 && hour <= 6) multiplier = 0.6;

    const players = Math.floor(
      basePlayerCount * multiplier + (Math.random() - 0.5) * 200
    );

    data.push({
      timestamp: timestamp.toISOString(),
      players: Math.max(0, players),
    });
  }

  return data;
}

function formatTimestamp(timestamp: string, period: Period): string {
  const date = new Date(timestamp);

  switch (period) {
    case "24h":
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    case "7d":
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit" });
    case "30d":
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export default function PlayerGraph({ data, className = "" }: PlayerGraphProps) {
  const [period, setPeriod] = useState<Period>("24h");

  // Use provided data or generate mock data
  const chartData = data && data.length > 0 ? data : generateMockData(period);

  const maxPlayers = Math.max(...chartData.map((d) => d.players));
  const minPlayers = Math.min(...chartData.map((d) => d.players));
  const avgPlayers = Math.floor(
    chartData.reduce((sum, d) => sum + d.players, 0) / chartData.length
  );

  return (
    <div className={`glass-card p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Player Count</h3>
          <p className="text-sm text-white/50">Track online players over time</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-void-800 rounded-lg p-1">
          {(["24h", "7d", "30d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p
                  ? "bg-adventure-500 text-white"
                  : "text-white/60 hover:text-white hover:bg-void-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-400">
            {maxPlayers.toLocaleString()}
          </div>
          <div className="text-xs text-white/50">Peak</div>
        </div>
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className="text-2xl font-bold text-adventure-400">
            {avgPlayers.toLocaleString()}
          </div>
          <div className="text-xs text-white/50">Average</div>
        </div>
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className="text-2xl font-bold text-white/80">
            {minPlayers.toLocaleString()}
          </div>
          <div className="text-xs text-white/50">Low</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="playerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => formatTimestamp(value, period)}
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
              }}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()} players`, "Online"]}
            />
            <Area
              type="monotone"
              dataKey="players"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#playerGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
