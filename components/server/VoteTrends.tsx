"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface VoteDataPoint {
  date: string;
  votes: number;
}

interface VoteTrendsProps {
  data?: VoteDataPoint[];
  className?: string;
}

// Generate mock data for demonstration
function generateMockData(days: number): VoteDataPoint[] {
  const data: VoteDataPoint[] = [];
  const now = Date.now();
  const baseVotes = 50 + Math.random() * 100;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();

    // Simulate weekly patterns - more votes on weekends
    let multiplier = 1;
    if (dayOfWeek === 0 || dayOfWeek === 6) multiplier = 1.4;
    else if (dayOfWeek === 5) multiplier = 1.2;

    const votes = Math.floor(
      baseVotes * multiplier + (Math.random() - 0.5) * 30
    );

    data.push({
      date: date.toISOString(),
      votes: Math.max(0, votes),
    });
  }

  return data;
}

export default function VoteTrends({ data, className = "" }: VoteTrendsProps) {
  const [days, setDays] = useState<7 | 14 | 30>(30);

  // Use provided data or generate mock data
  const chartData = data && data.length > 0 ? data.slice(-days) : generateMockData(days);

  const totalVotes = chartData.reduce((sum, d) => sum + d.votes, 0);
  const avgVotes = Math.floor(totalVotes / chartData.length);
  const maxVotes = Math.max(...chartData.map((d) => d.votes));

  // Calculate trend (compare last 7 days to previous 7 days)
  const recentVotes = chartData.slice(-7).reduce((sum, d) => sum + d.votes, 0);
  const previousVotes = chartData.slice(-14, -7).reduce((sum, d) => sum + d.votes, 0);
  const trendPercent = previousVotes > 0
    ? ((recentVotes - previousVotes) / previousVotes * 100).toFixed(1)
    : "0";
  const isPositiveTrend = recentVotes >= previousVotes;

  return (
    <div className={`glass-card p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Vote Trends</h3>
          <p className="text-sm text-white/50">Daily voting activity</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-void-800 rounded-lg p-1">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                days === d
                  ? "bg-purple-500 text-white"
                  : "text-white/60 hover:text-white hover:bg-void-700"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">
            {totalVotes.toLocaleString()}
          </div>
          <div className="text-xs text-white/50">Total ({days}d)</div>
        </div>
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className="text-2xl font-bold text-adventure-400">
            {avgVotes.toLocaleString()}
          </div>
          <div className="text-xs text-white/50">Daily Avg</div>
        </div>
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
            isPositiveTrend ? "text-emerald-400" : "text-red-400"
          }`}>
            {isPositiveTrend ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              </svg>
            )}
            {trendPercent}%
          </div>
          <div className="text-xs text-white/50">Trend (7d)</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="voteGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString([], { month: "short", day: "numeric" })
              }
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
              }}
              labelFormatter={(value) =>
                new Date(value).toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              }
              formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString()} votes`, "Votes"]}
            />
            <Bar
              dataKey="votes"
              fill="url(#voteGradient)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
