"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

// Simulated live activity data
const ACTIVITY_FEED = [
  { type: "join", player: "DragonSlayer99", server: "Legends of Orbis", time: "2m ago" },
  { type: "vote", player: "CrystalMage", server: "Emerald Adventures", time: "3m ago" },
  { type: "join", player: "NightHunter", server: "PvP Champions", time: "5m ago" },
  { type: "new", server: "Mystic Realms", players: 247, time: "12m ago" },
  { type: "vote", player: "StormBringer", server: "Legends of Orbis", time: "15m ago" },
  { type: "join", player: "FrostWarden", server: "Nordic Survival", time: "18m ago" },
];

const TESTIMONIALS = [
  {
    quote: "HyRank helped us grow from 50 to 2,000 daily players. The visibility is unmatched.",
    author: "Marcus K.",
    role: "Server Owner, Legends of Orbis",
    avatar: "M",
  },
  {
    quote: "Finally, a server list that actually helps players find quality communities.",
    author: "Sarah L.",
    role: "Community Manager",
    avatar: "S",
  },
  {
    quote: "Clean interface, accurate stats, and a team that actually listens to feedback.",
    author: "Alex T.",
    role: "Content Creator",
    avatar: "A",
  },
];

// Live activity ticker component
function ActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ACTIVITY_FEED.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activity = ACTIVITY_FEED[currentIndex];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "join":
        return (
          <div className="w-8 h-8 rounded-full bg-forest-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        );
      case "vote":
        return (
          <div className="w-8 h-8 rounded-full bg-hytale-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-hytale-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        );
      case "new":
        return (
          <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case "join":
        return (
          <>
            <span className="text-white font-medium">{activity.player}</span>
            <span className="text-white/50"> joined </span>
            <span className="text-hytale-400">{activity.server}</span>
          </>
        );
      case "vote":
        return (
          <>
            <span className="text-white font-medium">{activity.player}</span>
            <span className="text-white/50"> voted for </span>
            <span className="text-hytale-400">{activity.server}</span>
          </>
        );
      case "new":
        return (
          <>
            <span className="text-gold-400">{activity.server}</span>
            <span className="text-white/50"> launched with </span>
            <span className="text-white font-medium">{activity.players} players</span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative h-12 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="absolute inset-0 flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {getActivityIcon(activity.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{getActivityText()}</p>
            <p className="text-xs text-white/30">{activity.time}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Animated stat card with visual flair
function StatCard({ value, label, icon, color, delay }: { value: string; label: string; icon: string; color: string; delay: number }) {
  const colorClasses: Record<string, { bg: string; text: string; glow: string }> = {
    teal: { bg: "bg-hytale-500/10", text: "text-hytale-400", glow: "shadow-hytale-500/20" },
    purple: { bg: "bg-crystal-500/10", text: "text-crystal-400", glow: "shadow-crystal-500/20" },
    orange: { bg: "bg-ember-500/10", text: "text-ember-400", glow: "shadow-ember-500/20" },
    gold: { bg: "bg-gold-500/10", text: "text-gold-400", glow: "shadow-gold-500/20" },
  };

  const { bg, text, glow } = colorClasses[color] || colorClasses.teal;

  const icons: Record<string, JSX.Element> = {
    servers: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    players: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    uptime: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    votes: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  };

  return (
    <motion.div
      className={`relative p-6 rounded-2xl ${bg} border border-white/5 group hover:border-white/10 transition-all duration-300`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4 }}
    >
      {/* Glow on hover */}
      <div className={`absolute -inset-px rounded-2xl ${bg} opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10`} />

      <div className={`w-10 h-10 rounded-xl ${bg} ${text} flex items-center justify-center mb-4`}>
        {icons[icon]}
      </div>

      <motion.div
        className={`text-3xl font-bold ${text} mb-1`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: delay + 0.2 }}
      >
        {value}
      </motion.div>

      <div className="text-sm text-white/50">{label}</div>
    </motion.div>
  );
}

// Journey step component
function JourneyStep({ step, title, description, delay }: { step: number; title: string; description: string; delay: number }) {
  return (
    <motion.div
      className="relative flex gap-4"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      {/* Step number */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-hytale-500 to-hytale-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-hytale-500/25">
          {step}
        </div>
        {step < 3 && (
          <div className="w-px h-16 bg-gradient-to-b from-hytale-500/50 to-transparent mx-auto mt-2" />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
        <p className="text-white/50 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

export default function TrustSignals() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 lg:py-32">
      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20" />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-16 items-start">
        {/* Left Column - Why HyRank */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-hytale-500/10 border border-hytale-500/20 text-hytale-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hytale-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-hytale-500" />
            </span>
            Live Platform
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Where Players Find
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-hytale-400 to-crystal-400">
              Their Next Adventure
            </span>
          </h2>

          <p className="text-lg text-white/60 mb-10 leading-relaxed">
            Join thousands of players discovering quality Hytale servers every day.
            Real-time stats. Verified communities. Zero spam.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <StatCard value="500+" label="Active Servers" icon="servers" color="teal" delay={0.1} />
            <StatCard value="125K+" label="Monthly Players" icon="players" color="purple" delay={0.2} />
            <StatCard value="99.9%" label="Uptime Accuracy" icon="uptime" color="orange" delay={0.3} />
            <StatCard value="1M+" label="Votes Cast" icon="votes" color="gold" delay={0.4} />
          </div>

          {/* Live Activity */}
          <div className="p-4 rounded-2xl bg-night-900/50 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-500" />
              </span>
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Live Activity</span>
            </div>
            <ActivityTicker />
          </div>
        </motion.div>

        {/* Right Column - Journey + Testimonials */}
        <div>
          {/* Player Journey */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-white mb-6">Your Journey Starts Here</h3>

            <JourneyStep
              step={1}
              title="Discover"
              description="Browse curated servers by gamemode, player count, or community size. Real stats, no fake numbers."
              delay={0.3}
            />
            <JourneyStep
              step={2}
              title="Compare"
              description="See uptime history, read verified reviews, and check player activity patterns before you commit."
              delay={0.4}
            />
            <JourneyStep
              step={3}
              title="Join & Play"
              description="Copy the IP, join instantly, and become part of a thriving community. It's that simple."
              delay={0.5}
            />
          </motion.div>

          {/* Testimonial Card */}
          <motion.div
            className="relative p-6 rounded-2xl bg-gradient-to-br from-night-800/80 to-night-900/80 border border-white/5 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {/* Quote decoration */}
            <div className="absolute top-4 right-4 text-hytale-500/10 text-6xl font-serif">&quot;</div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-white/80 text-lg leading-relaxed mb-6 relative z-10">
                  &quot;{TESTIMONIALS[activeTestimonial].quote}&quot;
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-hytale-500 to-crystal-500 flex items-center justify-center text-white font-bold text-sm">
                    {TESTIMONIALS[activeTestimonial].avatar}
                  </div>
                  <div>
                    <div className="text-white font-medium">{TESTIMONIALS[activeTestimonial].author}</div>
                    <div className="text-white/40 text-sm">{TESTIMONIALS[activeTestimonial].role}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Testimonial dots */}
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeTestimonial
                      ? "bg-hytale-500 w-6"
                      : "bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom CTA - Enterprise Professional */}
      <motion.div
        className="mt-20 relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-hytale-600/20 via-night-900 to-crystal-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,230,184,0.1)_0%,_transparent_70%)]" />

        {/* Border glow */}
        <div className="absolute inset-0 rounded-3xl border border-white/10" />

        <div className="relative p-10 lg:p-16">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h3
              className="text-2xl lg:text-3xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              Ready to Put Your Server on the Map?
            </motion.h3>

            <motion.p
              className="text-white/60 text-lg mb-8 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              Join 500+ server owners who&apos;ve grown their communities through HyRank.
              Free to list. Premium features for serious growth.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Link
                href="/submit"
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold bg-white text-night-950 shadow-xl shadow-white/10 hover:shadow-2xl hover:shadow-white/20 transition-all overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  List Your Server Free
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-hytale-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                href="/premium"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium text-gold-400 bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 hover:border-gold-500/50 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Explore Premium
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="flex items-center justify-center gap-6 mt-8 text-sm text-white/40"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Setup in 2 minutes
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-forest-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                24/7 monitoring included
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
