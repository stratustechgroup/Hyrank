"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

interface RankingFiltersProps {
  allTags: string[];
  search: string;
  tag: string;
  sort: string;
  verifiedOnly: boolean;
  view: "list" | "grid";
}

export default function RankingFilters({
  allTags,
  search,
  tag,
  sort,
  verifiedOnly,
  view,
}: RankingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (updates: Record<string, string | undefined>) => {
      const sp = new URLSearchParams();
      // Preserve current params
      if (search) sp.set("search", search);
      if (tag) sp.set("tag", tag);
      if (sort && sort !== "rank") sp.set("sort", sort);
      if (verifiedOnly) sp.set("verified", "1");
      if (view === "grid") sp.set("view", "grid");
      // Apply updates (undefined = delete)
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === "") {
          sp.delete(k);
        } else {
          sp.set(k, v);
        }
      }
      // Always reset to page 1 on filter change
      sp.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${sp.toString()}`);
      });
    },
    [router, pathname, search, tag, sort, verifiedOnly, view],
  );

  const hasActiveFilters = search || tag || verifiedOnly;

  const handleClear = () => {
    startTransition(() => {
      router.replace(pathname);
    });
  };

  return (
    <div className="card p-5 mb-8">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              defaultValue={search}
              onChange={(e) => {
                const val = e.target.value;
                // Debounce via setTimeout
                const id = setTimeout(() => update({ search: val || undefined }), 400);
                return () => clearTimeout(id);
              }}
              placeholder="Search servers by name or description..."
              className="input pl-12"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm shrink-0">Sort by:</span>
          <select
            className="input py-2.5 w-auto"
            value={sort}
            onChange={(e) => update({ sort: e.target.value !== "rank" ? e.target.value : undefined })}
          >
            <option value="rank">Rank</option>
            <option value="players">Players Online</option>
            <option value="votes">Most Votes</option>
            <option value="newest">Newest</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {/* Verified Toggle */}
        <button
          onClick={() => update({ verified: verifiedOnly ? undefined : "1" })}
          className={`btn ${
            verifiedOnly
              ? "bg-hytale-500/15 border-hytale-500/30 text-hytale-400"
              : "btn-secondary"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Verified Only
        </button>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-100/80 border border-white/[0.04]">
          <button
            onClick={() => update({ view: undefined })}
            className={`p-2 rounded-lg transition-all ${
              view === "list" ? "bg-hytale-500/15 text-hytale-400" : "text-white/40 hover:text-white/70"
            }`}
            title="List view"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            onClick={() => update({ view: "grid" })}
            className={`p-2 rounded-lg transition-all ${
              view === "grid" ? "bg-hytale-500/15 text-hytale-400" : "text-white/40 hover:text-white/70"
            }`}
            title="Grid view"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tag filter */}
      <div className="mt-5 pt-5 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/40 text-sm font-medium">Filter by category:</span>
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="text-sm text-hytale-400 hover:text-hytale-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => update({ tag: tag === t ? undefined : t })}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                tag === t
                  ? "bg-hytale-500 text-white shadow-lg shadow-hytale-500/25"
                  : "bg-night-800/60 text-white/60 border border-white/5 hover:text-white hover:bg-night-700/60 hover:border-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
