"use client";

import Link from "next/link";

/**
 * Minimal client island for the dashboard empty-state CTA.
 * The full page.tsx is a server component — interactive bits go here.
 */
export default function DashboardShell() {
  return (
    <Link
      href="/submit"
      className="inline-flex items-center gap-2 px-6 py-3 bg-adventure-500 hover:bg-adventure-600 text-white font-semibold rounded-lg transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Submit a Server
    </Link>
  );
}
