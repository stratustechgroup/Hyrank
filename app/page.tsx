"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import WaitlistModal from "@/components/WaitlistModal";

// Animated floating orb component
function GlowingOrb({
  color,
  size,
  position,
  delay = 0,
}: {
  color: "emerald" | "gold" | "blue";
  size: "sm" | "md" | "lg" | "xl";
  position: { top?: string; bottom?: string; left?: string; right?: string };
  delay?: number;
}) {
  const colorClasses = {
    emerald: "bg-adventure-500",
    gold: "bg-legendary-500",
    blue: "bg-blue-500",
  };

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
    xl: "w-96 h-96",
  };

  return (
    <motion.div
      className={`glow-orb ${colorClasses[color]} ${sizeClasses[size]}`}
      style={position}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.2, 0.4, 0.2],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

// Feature card component
function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      className="glass-card p-6 hover:border-adventure-500/30 transition-colors duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-adventure-500/20 to-legendary-500/20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <GlowingOrb
          color="emerald"
          size="xl"
          position={{ top: "-10%", left: "-10%" }}
          delay={0}
        />
        <GlowingOrb
          color="gold"
          size="lg"
          position={{ top: "20%", right: "-5%" }}
          delay={1}
        />
        <GlowingOrb
          color="blue"
          size="md"
          position={{ bottom: "10%", left: "20%" }}
          delay={2}
        />
        <GlowingOrb
          color="emerald"
          size="lg"
          position={{ bottom: "-10%", right: "10%" }}
          delay={1.5}
        />
        <GlowingOrb
          color="gold"
          size="sm"
          position={{ top: "50%", left: "5%" }}
          delay={0.5}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Logo/Brand */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-adventure-500 to-adventure-600 flex items-center justify-center shadow-lg shadow-adventure-500/30">
                <svg
                  className="w-8 h-8 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-legendary-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Hy<span className="text-adventure-400">Rank</span>
                <span className="text-legendary-400">.gg</span>
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Coming Soon Badge */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="glass-card px-4 py-2 inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-adventure-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-adventure-500" />
            </span>
            <span className="text-sm font-medium text-white/80">
              Coming Soon to the Alterverse
            </span>
          </div>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          className="text-center max-w-4xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Discover the{" "}
            <span className="gradient-text">Best Hytale Servers</span>
          </h2>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            The ultimate destination for Hytale server rankings, discovery, and
            community. Be the first to explore when we launch.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          className="mb-16 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-legendary group inline-flex items-center justify-center gap-3 text-lg"
          >
            <span>Join the Waitlist</span>
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <p className="text-center text-white/40 text-sm mt-3">
            Early access for server owners & players
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full">
          <FeatureCard
            icon={
              <svg
                className="w-6 h-6 text-adventure-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            }
            title="Real-Time Rankings"
            description="Live server rankings based on player count, uptime, and community ratings."
            delay={0.5}
          />
          <FeatureCard
            icon={
              <svg
                className="w-6 h-6 text-legendary-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            title="Smart Discovery"
            description="Find your perfect server with advanced filters for game modes, regions, and playstyles."
            delay={0.6}
          />
          <FeatureCard
            icon={
              <svg
                className="w-6 h-6 text-adventure-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="Server Owner Tools"
            description="Powerful analytics dashboard, promotional tools, and community management features."
            delay={0.7}
          />
        </div>

        {/* Stats Preview */}
        <motion.div
          className="mt-16 glass-card p-8 max-w-3xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-adventure-400 mb-1">
                1000+
              </div>
              <div className="text-white/50 text-sm">Expected Servers</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-legendary-400 mb-1">
                50K+
              </div>
              <div className="text-white/50 text-sm">Early Signups</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-adventure-400 mb-1">
                24/7
              </div>
              <div className="text-white/50 text-sm">Server Monitoring</div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="mt-16 text-center text-white/40 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <p className="mb-2">
            &copy; {new Date().getFullYear()} HyRank.gg. All rights reserved.
          </p>
          <p className="text-xs text-white/30">
            Not affiliated with Hypixel Studios or Hytale.
          </p>
        </motion.footer>
      </div>

      {/* Waitlist Modal */}
      <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}
