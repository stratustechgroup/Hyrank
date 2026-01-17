"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeroSectionProps {
  serverCount?: number;
  playerCount?: number;
}

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// Hytale-style floating crystal
function FloatingCrystal({ delay = 0, size = 40, className = "", color = "hytale" }: { delay?: number; size?: number; className?: string; color?: "hytale" | "crystal" | "ember" }) {
  const gradients = {
    hytale: ["#00e6b8", "#4dffdc"],
    crystal: ["#a855f7", "#d8b4fe"],
    ember: ["#f97316", "#fdba74"],
  };

  const [start, end] = gradients[color];

  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0.4, 0.7, 0.4],
        y: [0, -25, 0],
        rotate: [0, 8, 0],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none">
        <defs>
          <linearGradient id={`crystal-grad-${delay}-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={start} stopOpacity="0.8" />
            <stop offset="100%" stopColor={end} stopOpacity="0.5" />
          </linearGradient>
          <filter id={`crystal-glow-${delay}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Crystal shape */}
        <polygon
          points="20,0 38,18 20,52 2,18"
          fill={`url(#crystal-grad-${delay}-${color})`}
          filter={`url(#crystal-glow-${delay})`}
        />
        {/* Highlight */}
        <polygon
          points="20,0 38,18 20,24 2,18"
          fill="rgba(255,255,255,0.15)"
        />
        {/* Inner line */}
        <line x1="20" y1="10" x2="20" y2="40" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
}

// Animated search bar component
function SearchBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/rankings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <motion.form
      onSubmit={handleSearch}
      className={`relative w-full max-w-xl mx-auto transition-all duration-300 ${
        isFocused ? "scale-[1.02]" : ""
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25 }}
    >
      <div className={`relative flex items-center rounded-2xl bg-night-900/60 backdrop-blur-xl border transition-all duration-300 ${
        isFocused
          ? "border-hytale-500/50 shadow-lg shadow-hytale-500/20"
          : "border-white/10 hover:border-white/20"
      }`}>
        {/* Search icon */}
        <div className="absolute left-5 text-white/40">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          placeholder="Search for servers, games, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full py-4 pl-14 pr-32 bg-transparent text-white placeholder-white/40 outline-none text-lg"
        />

        {/* Search button */}
        <button
          type="submit"
          className="absolute right-2 px-6 py-2.5 bg-gradient-to-r from-hytale-500 to-hytale-600 text-white font-semibold rounded-xl hover:from-hytale-400 hover:to-hytale-500 transition-all shadow-lg shadow-hytale-500/25"
        >
          Search
        </button>
      </div>

      {/* Popular searches */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
        <span className="text-sm text-white/40">Popular:</span>
        {["SMP", "PvP", "Minigames", "RPG"].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => router.push(`/tags/${tag.toLowerCase()}`)}
            className="px-3 py-1 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </motion.form>
  );
}

export default function HeroSection({ serverCount = 500, playerCount = 125000 }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[95vh] flex items-center justify-center overflow-hidden"
    >
      {/* Extra gradient layers for hero */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 100% 70% at 50% 0%, rgba(0, 230, 184, 0.12), transparent 60%),
              radial-gradient(ellipse 60% 40% at 90% 70%, rgba(168, 85, 247, 0.08), transparent),
              radial-gradient(ellipse 50% 30% at 10% 60%, rgba(249, 115, 22, 0.06), transparent)
            `,
          }}
        />
      </div>

      {/* Floating crystals */}
      <FloatingCrystal delay={0} size={55} className="top-[15%] left-[8%]" color="hytale" />
      <FloatingCrystal delay={1} size={45} className="top-[25%] right-[12%]" color="crystal" />
      <FloatingCrystal delay={2} size={40} className="bottom-[30%] left-[15%]" color="ember" />
      <FloatingCrystal delay={3} size={50} className="bottom-[20%] right-[8%]" color="hytale" />
      <FloatingCrystal delay={2.5} size={35} className="top-[60%] left-[25%]" color="crystal" />
      <FloatingCrystal delay={1.5} size={30} className="top-[40%] right-[25%]" color="ember" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 text-center"
        style={{ y, opacity }}
      >
        {/* Live badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-night-800/60 backdrop-blur-sm border border-white/10 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-forest-500"></span>
          </span>
          <span className="text-sm font-medium text-white/70">
            <span className="text-hytale-400 font-bold"><AnimatedCounter value={serverCount} /></span> servers online now
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          className="mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight text-white">
            Find Your Perfect
          </span>
          <span className="block mt-2 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight hero-title">
            Hytale Server
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="hero-subtitle mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          The definitive server list for Hytale. Discover, compare, and join
          the best gaming communities across every gamemode.
        </motion.p>

        {/* Search Bar */}
        <SearchBar />

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {[
            { value: serverCount, suffix: "+", label: "Active Servers", icon: "server" },
            { value: Math.floor(playerCount / 1000), suffix: "K+", label: "Total Players", icon: "users" },
            { value: 50, suffix: "+", label: "Categories", icon: "tag" },
            { value: 99.9, suffix: "%", label: "Uptime Tracking", icon: "chart", isStatic: true },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="relative group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
            >
              <div className="p-5 rounded-2xl bg-night-900/40 backdrop-blur-sm border border-white/5 hover:border-hytale-500/30 transition-all duration-300 group-hover:bg-night-900/60">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  {stat.isStatic ? stat.value : <AnimatedCounter value={stat.value} />}{stat.suffix}
                </div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
              {/* Hover glow */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-hytale-500/20 to-crystal-500/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2 text-white/30"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
