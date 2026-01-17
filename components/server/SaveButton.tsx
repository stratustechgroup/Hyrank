"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth/AuthContext";

interface SaveButtonProps {
  serverId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    button: "p-1.5",
    icon: "w-4 h-4",
    text: "text-xs",
  },
  md: {
    button: "p-2",
    icon: "w-5 h-5",
    text: "text-sm",
  },
  lg: {
    button: "p-2.5",
    icon: "w-6 h-6",
    text: "text-base",
  },
};

export default function SaveButton({
  serverId,
  size = "md",
  showLabel = false,
  className = "",
}: SaveButtonProps) {
  const { user, isConfigured } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const sizes = sizeConfig[size];

  // Load saved state from localStorage (for guests) or API (for logged in users)
  useEffect(() => {
    if (user && isConfigured) {
      // Check from API
      checkSavedStatus();
    } else {
      // Check from localStorage
      const savedServers = JSON.parse(
        localStorage.getItem("savedServers") || "[]"
      );
      setIsSaved(savedServers.includes(serverId));
    }
  }, [serverId, user, isConfigured]);

  const checkSavedStatus = async () => {
    try {
      const response = await fetch(`/api/user/favorites/${serverId}`);
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data.isSaved);
      }
    } catch (error) {
      console.error("Failed to check saved status:", error);
    }
  };

  const handleToggleSave = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      if (user && isConfigured) {
        // Save via API for logged in users
        const response = await fetch(`/api/user/favorites/${serverId}`, {
          method: isSaved ? "DELETE" : "POST",
        });

        if (response.ok) {
          setIsSaved(!isSaved);
        }
      } else {
        // Save to localStorage for guests
        const savedServers = JSON.parse(
          localStorage.getItem("savedServers") || "[]"
        );

        if (isSaved) {
          const updated = savedServers.filter((id: string) => id !== serverId);
          localStorage.setItem("savedServers", JSON.stringify(updated));
        } else {
          savedServers.push(serverId);
          localStorage.setItem("savedServers", JSON.stringify(savedServers));
        }

        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error("Failed to toggle save:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleToggleSave}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={isLoading}
        className={`
          ${sizes.button}
          rounded-lg
          transition-colors
          ${
            isSaved
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
          }
          disabled:opacity-50
          disabled:cursor-not-allowed
          flex items-center gap-2
          ${className}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg
          className={sizes.icon}
          viewBox="0 0 24 24"
          fill={isSaved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {showLabel && (
          <span className={sizes.text}>
            {isSaved ? "Saved" : "Save"}
          </span>
        )}
      </motion.button>

      {/* Tooltip */}
      {showTooltip && !showLabel && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-void-800 text-white text-xs rounded whitespace-nowrap z-50"
        >
          {isSaved ? "Remove from saved" : "Save server"}
        </motion.div>
      )}
    </div>
  );
}
