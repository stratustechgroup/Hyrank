"use client";

interface UptimeBadgeProps {
  uptime: number | null;
  period?: "day" | "week" | "month";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const periodLabels = {
  day: "24h",
  week: "7d",
  month: "30d",
};

const sizeConfig = {
  sm: {
    text: "text-xs",
    padding: "px-1.5 py-0.5",
    icon: "w-3 h-3",
  },
  md: {
    text: "text-sm",
    padding: "px-2 py-1",
    icon: "w-4 h-4",
  },
  lg: {
    text: "text-base",
    padding: "px-2.5 py-1.5",
    icon: "w-5 h-5",
  },
};

function getUptimeColor(uptime: number | null): {
  bg: string;
  text: string;
  border: string;
} {
  if (uptime === null) {
    return {
      bg: "bg-void-700/50",
      text: "text-white/40",
      border: "border-void-600/50",
    };
  }

  if (uptime >= 99) {
    return {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
    };
  }

  if (uptime >= 95) {
    return {
      bg: "bg-adventure-500/10",
      text: "text-adventure-400",
      border: "border-adventure-500/20",
    };
  }

  if (uptime >= 90) {
    return {
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      border: "border-yellow-500/20",
    };
  }

  return {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  };
}

export default function UptimeBadge({
  uptime,
  period = "month",
  showLabel = true,
  size = "md",
}: UptimeBadgeProps) {
  const colors = getUptimeColor(uptime);
  const sizes = sizeConfig[size];

  const displayValue = uptime !== null ? `${uptime.toFixed(1)}%` : "N/A";

  return (
    <div
      className={`inline-flex items-center gap-1 ${sizes.padding} ${colors.bg} ${colors.text} ${sizes.text} font-medium rounded-md border ${colors.border}`}
    >
      {/* Uptime Icon */}
      <svg
        className={sizes.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>

      {/* Uptime Value */}
      <span>{displayValue}</span>

      {/* Period Label */}
      {showLabel && uptime !== null && (
        <span className="text-white/40">{periodLabels[period]}</span>
      )}
    </div>
  );
}

// Compact inline version
export function UptimeInline({
  uptime,
  period = "month",
}: {
  uptime: number | null;
  period?: "day" | "week" | "month";
}) {
  const colors = getUptimeColor(uptime);

  if (uptime === null) {
    return <span className="text-xs text-white/40">No uptime data</span>;
  }

  return (
    <span className={`text-xs font-medium ${colors.text}`}>
      {uptime.toFixed(1)}% uptime ({periodLabels[period]})
    </span>
  );
}

// Visual bar version for detail pages
export function UptimeBar({
  uptime,
  height = "h-2",
}: {
  uptime: number | null;
  height?: string;
}) {
  const colors = getUptimeColor(uptime);
  const percentage = uptime ?? 0;

  return (
    <div className={`w-full ${height} bg-void-700 rounded-full overflow-hidden`}>
      <div
        className={`${height} rounded-full transition-all duration-500 ${
          uptime !== null ? colors.bg.replace("/10", "") : "bg-void-600"
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
