"use client";

/**
 * TrustStats — client component placeholder for future weekly aggregate charts.
 * Currently renders a simple summary bar; will be wired to Recharts in Plan 5.
 */
export interface TrustStatsProps {
  shadowVotes: number;
  demotedServers: number;
  flaggedUsers: number;
}

export function TrustStats({ shadowVotes, demotedServers, flaggedUsers }: TrustStatsProps) {
  const total = shadowVotes + demotedServers + flaggedUsers;

  if (total === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-4">
        No moderation events recorded this week.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="w-40 text-gray-400 truncate">Shadow-invalidated</span>
        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full"
            style={{ width: `${Math.min(100, (shadowVotes / Math.max(total, 1)) * 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-white font-medium">{shadowVotes}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-40 text-gray-400 truncate">Servers demoted</span>
        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full"
            style={{ width: `${Math.min(100, (demotedServers / Math.max(total, 1)) * 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-white font-medium">{demotedServers}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-40 text-gray-400 truncate">Accounts flagged</span>
        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full"
            style={{ width: `${Math.min(100, (flaggedUsers / Math.max(total, 1)) * 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-white font-medium">{flaggedUsers}</span>
      </div>
    </div>
  );
}
