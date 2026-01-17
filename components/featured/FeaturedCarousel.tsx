"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import FeaturedServerCard from "./FeaturedServerCard";
import { FeaturedCardSkeleton } from "@/components/ui/Skeleton";
import type { Server } from "@/lib/supabase/queries";

interface FeaturedCarouselProps {
  servers: Server[];
  isLoading?: boolean;
}

export default function FeaturedCarousel({ servers, isLoading = false }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-legendary-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Featured Servers
            </h2>
            <p className="text-white/50 text-sm mt-1">Premium promoted servers</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <FeaturedCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (servers.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-legendary-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            Featured Servers
          </h2>
          <p className="text-white/50 text-sm mt-1">Premium promoted servers</p>
        </div>

        {/* Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Gradient Fades */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-void-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-void-950 to-transparent z-10 pointer-events-none" />

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-thin pb-2 -mx-2 px-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {servers.map((server, index) => (
            <div key={server.id} style={{ scrollSnapAlign: "start" }}>
              <FeaturedServerCard server={server} index={index} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
