"use client";

import { useMemo } from "react";

interface UptimeDataPoint {
  date: string;
  status: "online" | "offline" | "partial" | "unknown";
  uptime: number; // 0-100
}

interface UptimeTrackerProps {
  data?: UptimeDataPoint[];
  uptimeDay?: number | null;
  uptimeWeek?: number | null;
  uptimeMonth?: number | null;
  className?: string;
}

// Generate mock data for demonstration
function generateMockData(days: number): UptimeDataPoint[] {
  const data: UptimeDataPoint[] = [];
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const random = Math.random();

    let uptime: number;
    let status: UptimeDataPoint["status"];

    if (random > 0.05) {
      // 95% chance of good uptime
      uptime = 95 + Math.random() * 5;
      status = uptime >= 99 ? "online" : "partial";
    } else if (random > 0.02) {
      // 3% chance of degraded
      uptime = 80 + Math.random() * 15;
      status = "partial";
    } else {
      // 2% chance of outage
      uptime = Math.random() * 50;
      status = "offline";
    }

    data.push({
      date: date.toISOString(),
      uptime,
      status,
    });
  }

  return data;
}

function getUptimeColor(uptime: number): string {
  if (uptime >= 99) return "bg-emerald-500";
  if (uptime >= 95) return "bg-emerald-400";
  if (uptime >= 90) return "bg-yellow-500";
  if (uptime >= 80) return "bg-orange-500";
  if (uptime >= 50) return "bg-red-400";
  return "bg-red-600";
}

function getStatusColor(status: UptimeDataPoint["status"]): string {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "partial":
      return "bg-yellow-500";
    case "offline":
      return "bg-red-500";
    default:
      return "bg-void-600";
  }
}

export default function UptimeTracker({
  data,
  uptimeDay,
  uptimeWeek,
  uptimeMonth,
  className = "",
}: UptimeTrackerProps) {
  // Use provided data or generate mock data
  const chartData = useMemo(
    () => (data && data.length > 0 ? data : generateMockData(30)),
    [data]
  );

  // Calculate overall uptime if not provided
  const calculatedUptimeMonth = useMemo(() => {
    if (uptimeMonth !== null && uptimeMonth !== undefined) return uptimeMonth;
    const sum = chartData.reduce((acc, d) => acc + d.uptime, 0);
    return sum / chartData.length;
  }, [chartData, uptimeMonth]);

  const calculatedUptimeWeek = useMemo(() => {
    if (uptimeWeek !== null && uptimeWeek !== undefined) return uptimeWeek;
    const last7 = chartData.slice(-7);
    const sum = last7.reduce((acc, d) => acc + d.uptime, 0);
    return sum / last7.length;
  }, [chartData, uptimeWeek]);

  const calculatedUptimeDay = useMemo(() => {
    if (uptimeDay !== null && uptimeDay !== undefined) return uptimeDay;
    return chartData[chartData.length - 1]?.uptime ?? 0;
  }, [chartData, uptimeDay]);

  // Count incidents
  const incidents = chartData.filter((d) => d.uptime < 95).length;

  return (
    <div className={`glass-card p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Uptime History</h3>
          <p className="text-sm text-white/50">Last 30 days performance</p>
        </div>
        <div className={`text-3xl font-bold ${
          calculatedUptimeMonth >= 99 ? "text-emerald-400" :
          calculatedUptimeMonth >= 95 ? "text-adventure-400" :
          calculatedUptimeMonth >= 90 ? "text-yellow-400" :
          "text-red-400"
        }`}>
          {calculatedUptimeMonth.toFixed(2)}%
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className={`text-xl font-bold ${
            calculatedUptimeDay >= 99 ? "text-emerald-400" :
            calculatedUptimeDay >= 95 ? "text-adventure-400" :
            "text-yellow-400"
          }`}>
            {calculatedUptimeDay.toFixed(1)}%
          </div>
          <div className="text-xs text-white/50">Today</div>
        </div>
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className={`text-xl font-bold ${
            calculatedUptimeWeek >= 99 ? "text-emerald-400" :
            calculatedUptimeWeek >= 95 ? "text-adventure-400" :
            "text-yellow-400"
          }`}>
            {calculatedUptimeWeek.toFixed(1)}%
          </div>
          <div className="text-xs text-white/50">7 Days</div>
        </div>
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className={`text-xl font-bold ${
            calculatedUptimeMonth >= 99 ? "text-emerald-400" :
            calculatedUptimeMonth >= 95 ? "text-adventure-400" :
            "text-yellow-400"
          }`}>
            {calculatedUptimeMonth.toFixed(1)}%
          </div>
          <div className="text-xs text-white/50">30 Days</div>
        </div>
        <div className="text-center p-3 bg-void-800/50 rounded-lg">
          <div className={`text-xl font-bold ${
            incidents === 0 ? "text-emerald-400" :
            incidents <= 2 ? "text-yellow-400" :
            "text-red-400"
          }`}>
            {incidents}
          </div>
          <div className="text-xs text-white/50">Incidents</div>
        </div>
      </div>

      {/* Uptime Grid */}
      <div className="flex flex-wrap gap-1 mb-4">
        {chartData.map((day, index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-sm ${getUptimeColor(day.uptime)} cursor-pointer hover:ring-2 hover:ring-white/30 transition-all`}
            title={`${new Date(day.date).toLocaleDateString()}: ${day.uptime.toFixed(1)}% uptime`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>30 days ago</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>Outage</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-yellow-500" />
            <span>Degraded</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>Operational</span>
          </div>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
}
