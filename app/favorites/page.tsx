"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ServerCard from "@/components/ServerCard";
import { useAuth } from "@/lib/auth/AuthContext";
import { getServerById, type Server } from "@/lib/supabase/queries";

export default function FavoritesPage() {
  const { user, isLoading: authLoading, isConfigured } = useAuth();
  const [savedServers, setSavedServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSavedServers = useCallback(async () => {
    setIsLoading(true);

    try {
      if (user && isConfigured) {
        // Fetch from API for logged in users
        const response = await fetch("/api/user/favorites");
        if (response.ok) {
          const data = await response.json();
          setSavedServers(data.servers || []);
        }
      } else {
        // Load from localStorage for guests
        const savedIds = JSON.parse(
          localStorage.getItem("savedServers") || "[]"
        );

        // Get servers from Supabase
        const serverPromises = savedIds.map((id: string) => getServerById(id));
        const servers = (await Promise.all(serverPromises)).filter(Boolean) as Server[];

        setSavedServers(servers);
      }
    } catch (error) {
      console.error("Failed to load saved servers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isConfigured]);

  useEffect(() => {
    loadSavedServers();
  }, [loadSavedServers]);

  const handleRemoveServer = (serverId: string) => {
    setSavedServers((prev) => prev.filter((s) => s.id !== serverId));

    if (!user) {
      // Update localStorage
      const savedIds = JSON.parse(
        localStorage.getItem("savedServers") || "[]"
      );
      const updated = savedIds.filter((id: string) => id !== serverId);
      localStorage.setItem("savedServers", JSON.stringify(updated));
    }
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-white/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Saved Servers
          </h1>
        </div>
        <p className="text-white/50">
          {user
            ? "Your favorite servers, synced across devices"
            : "Your favorite servers (saved locally)"}
        </p>
      </motion.div>

      {/* Guest login prompt */}
      {!user && savedServers.length > 0 && (
        <motion.div
          className="mb-6 p-4 glass-card border border-adventure-500/20 flex items-center justify-between"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-adventure-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span className="text-white/70 text-sm">
              Sign in to sync your saved servers across devices
            </span>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium bg-adventure-500 hover:bg-adventure-600 text-white rounded-lg transition-colors"
          >
            Sign in
          </Link>
        </motion.div>
      )}

      {/* Empty state */}
      {savedServers.length === 0 ? (
        <motion.div
          className="glass-card p-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white/30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No saved servers yet
          </h2>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            Click the heart icon on any server card to save it here for quick access
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-adventure-500 hover:bg-adventure-600 text-white rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Browse Servers
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Stats */}
          <motion.div
            className="mb-6 text-sm text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {savedServers.length} saved server{savedServers.length !== 1 ? "s" : ""}
          </motion.div>

          {/* Server Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {savedServers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <ServerCard server={server} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
