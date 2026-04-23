"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface SelectedMod {
  id: number;
  name: string;
  slug: string;
}

interface ModResult {
  id: number;
  name: string;
  slug: string;
  downloads: number;
  logo: string | null;
  url: string | null;
}

interface ModPickerProps {
  selectedMods: SelectedMod[];
  onChange: (mods: SelectedMod[]) => void;
}

export default function ModPicker({ selectedMods, onChange }: ModPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<ModResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [noApiKey, setNoApiKey] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch mods when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/curseforge/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: { mods: ModResult[]; error?: string }) => {
        if (cancelled) return;
        if (data.error === "CURSEFORGE_API_KEY not configured") {
          setNoApiKey(true);
          setResults([]);
        } else {
          setNoApiKey(false);
          setResults(data.mods ?? []);
        }
        setIsOpen(true);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addMod = useCallback(
    (mod: ModResult) => {
      if (selectedMods.some((m) => m.id === mod.id)) return;
      onChange([...selectedMods, { id: mod.id, name: mod.name, slug: mod.slug }]);
      setQuery("");
      setResults([]);
      setIsOpen(false);
    },
    [selectedMods, onChange],
  );

  const removeMod = useCallback(
    (id: number) => {
      onChange(selectedMods.filter((m) => m.id !== id));
    },
    [selectedMods, onChange],
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/70">
        Mods / Plugins
        <span className="ml-1 text-white/30 font-normal">(optional)</span>
      </label>

      {/* Selected mods chips */}
      {selectedMods.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMods.map((mod) => (
            <span
              key={mod.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-hytale-500/15 border border-hytale-500/25 text-hytale-400 rounded-lg text-sm font-medium"
            >
              {mod.name}
              <button
                type="button"
                onClick={() => removeMod(mod.id)}
                className="text-hytale-400/60 hover:text-hytale-400 transition-colors"
                aria-label={`Remove ${mod.name}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-hytale-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={noApiKey ? "Enter mod name manually (API key not configured)" : "Search CurseForge mods..."}
            className="input-glass pl-10"
          />
        </div>

        {/* Dropdown results */}
        {isOpen && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-night-900 border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {results.map((mod) => {
              const alreadySelected = selectedMods.some((m) => m.id === mod.id);
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => addMod(mod)}
                  disabled={alreadySelected}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    alreadySelected
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-white/5 cursor-pointer"
                  }`}
                >
                  {mod.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mod.logo} alt={mod.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-medium truncate">{mod.name}</div>
                    <div className="text-white/40 text-xs">{mod.downloads.toLocaleString()} downloads</div>
                  </div>
                  {alreadySelected && (
                    <span className="text-hytale-400 text-xs shrink-0">Added</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* No results state */}
        {isOpen && !isLoading && results.length === 0 && debouncedQuery.length >= 2 && !noApiKey && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-night-900 border border-white/10 rounded-xl shadow-xl px-4 py-3 text-white/40 text-sm">
            No mods found for &ldquo;{debouncedQuery}&rdquo;
          </div>
        )}
      </div>

      {noApiKey && (
        <p className="text-white/30 text-xs">
          CurseForge API key not configured — add mod names manually or contact the admin.
        </p>
      )}
    </div>
  );
}
