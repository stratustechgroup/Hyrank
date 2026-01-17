"use client";

interface StatusBadgeProps {
  status: "online" | "offline" | "unknown";
  latency?: number;
  showLatency?: boolean;
  size?: "sm" | "md" | "lg";
}

// Using Obsidian design system status colors
const statusConfig = {
  online: {
    color: "bg-status-online",
    textColor: "text-status-online",
    label: "Online",
  },
  offline: {
    color: "bg-status-offline",
    textColor: "text-status-offline",
    label: "Offline",
  },
  unknown: {
    color: "bg-status-unknown",
    textColor: "text-status-unknown",
    label: "Unknown",
  },
};

const sizeConfig = {
  sm: {
    dot: "h-1.5 w-1.5",
    text: "text-xs",
    gap: "gap-1",
  },
  md: {
    dot: "h-2 w-2",
    text: "text-sm",
    gap: "gap-1.5",
  },
  lg: {
    dot: "h-2.5 w-2.5",
    text: "text-base",
    gap: "gap-2",
  },
};

export default function StatusBadge({
  status,
  latency,
  showLatency = false,
  size = "md",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <div className={`flex items-center ${sizes.gap}`}>
      {/* Status Dot with subtle animation */}
      <StatusDot status={status} size={size} />

      {/* Status Label */}
      <span className={`${sizes.text} font-medium ${config.textColor}`}>
        {config.label}
      </span>

      {/* Latency Display */}
      {showLatency && status === "online" && latency !== undefined && (
        <span className={`${sizes.text} text-platinum-500`}>
          ({latency}ms)
        </span>
      )}
    </div>
  );
}

// Compact dot version for use in cards
export function StatusDot({
  status,
  size = "sm",
  showPing = true,
}: {
  status: "online" | "offline" | "unknown";
  size?: "sm" | "md" | "lg";
  showPing?: boolean;
}) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <span className={`relative flex ${sizes.dot}`}>
      {/* Subtle ping animation for online status - reduced intensity */}
      {status === "online" && showPing && (
        <span
          className={`
            absolute inline-flex h-full w-full rounded-full
            ${config.color} opacity-50
            animate-ping-slow
          `}
          style={{
            // Reduced animation scale via CSS
            animationDuration: "2.5s",
          }}
        />
      )}
      <span
        className={`
          relative inline-flex rounded-full
          ${sizes.dot} ${config.color}
          ${status === "online" ? "animate-pulse-subtle" : ""}
        `}
      />
    </span>
  );
}

// Inline status indicator (just the dot, no label)
export function InlineStatusDot({
  status,
  className = "",
}: {
  status: "online" | "offline" | "unknown";
  className?: string;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-block w-2 h-2 rounded-full
        ${config.color}
        ${status === "online" ? "animate-pulse-subtle" : ""}
        ${className}
      `}
    />
  );
}
