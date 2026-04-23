import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hyrank.gg";

export const metadata: Metadata = {
  title: "Transparency & Anti-Fraud | HyRank",
  description:
    "HyRank publishes weekly moderation statistics so you can verify we're actually fighting vote fraud — unlike listing sites that hide their moderation.",
  openGraph: {
    title: "HyRank Anti-Fraud Transparency Report",
    description:
      "Weekly aggregate stats on shadow-invalidated votes, demoted servers, and flagged accounts.",
    url: `${SITE_URL}/trust`,
    type: "website",
  },
};

interface WeeklyStats {
  shadowVotes: number;
  demotedServers: number;
  flaggedUsers: number;
}

async function getWeeklyStats(): Promise<WeeklyStats> {
  const defaults: WeeklyStats = { shadowVotes: 0, demotedServers: 0, flaggedUsers: 0 };

  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return defaults;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const { data } = await supabase
      .from("moderation_log")
      .select("event_type, quantity")
      .gte("created_at", oneWeekAgo);

    if (!data) return defaults;

    let shadowVotes = 0;
    let demotedServers = 0;
    let flaggedUsers = 0;

    for (const row of data) {
      const qty = row.quantity ?? 1;
      if (row.event_type === "shadow_invalidated") shadowVotes += qty;
      else if (row.event_type === "server_demoted") demotedServers += qty;
      else if (row.event_type === "user_flagged") flaggedUsers += qty;
    }

    return { shadowVotes, demotedServers, flaggedUsers };
  } catch {
    return defaults;
  }
}

export default async function TrustPage() {
  const stats = await getWeeklyStats();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gradient">
            Anti-Fraud Transparency
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            HyRank publishes this so you can verify we&apos;re actually fighting
            fraud — unlike listing sites that hide their moderation.
          </p>
        </section>

        {/* Weekly stats */}
        <section className="glass-card p-8 space-y-6">
          <h2 className="text-xl font-semibold text-white">
            This Week&apos;s Moderation Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              label="Shadow-invalidated votes"
              value={stats.shadowVotes}
              description="Votes flagged as fraudulent; never reflected in rankings"
            />
            <StatCard
              label="Servers demoted"
              value={stats.demotedServers}
              description="Servers penalized for coordinated vote manipulation"
            />
            <StatCard
              label="Accounts flagged"
              value={stats.flaggedUsers}
              description="User accounts flagged for suspicious activity"
            />
          </div>
        </section>

        {/* How it works */}
        <section className="glass-card p-8 space-y-4">
          <h2 className="text-xl font-semibold text-white">
            How Our Anti-Fraud Pipeline Works
          </h2>
          <ul className="space-y-3 text-gray-300 text-sm leading-relaxed list-disc list-inside">
            <li>
              <strong className="text-white">Trust scoring</strong> — every vote
              is scored 0–100 using account age, browser fingerprint, IP
              velocity, mouse entropy, dwell time, and tab visibility.
            </li>
            <li>
              <strong className="text-white">Shadow invalidation</strong> —
              suspicious votes are stored as{" "}
              <code className="text-xs bg-white/10 px-1 rounded">
                shadow_invalidated
              </code>{" "}
              and never counted. Fraudulent voters always see &quot;Vote recorded&quot; —
              they can&apos;t tell which signal tripped them.
            </li>
            <li>
              <strong className="text-white">12-hour DB cooldown</strong> —
              enforced at the database layer via a partial unique index, making
              race-condition exploits structurally impossible.
            </li>
            <li>
              <strong className="text-white">IP sliding window</strong> — more
              than 5 votes per IP in any 10-minute window triggers an automatic
              trust penalty.
            </li>
          </ul>
          <p className="text-gray-500 text-sm pt-2">
            A full methodology document will be published in a future update.{" "}
            <Link href="/rankings" className="text-blue-400 hover:underline">
              View server rankings →
            </Link>
          </p>
        </section>

        {/* Moderation log note */}
        <p className="text-center text-gray-600 text-xs">
          Stats update as moderation events are logged. Historical data is
          retained indefinitely and never deleted.
        </p>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-5 space-y-1 border border-white/10">
      <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-sm font-medium text-gray-200">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}
