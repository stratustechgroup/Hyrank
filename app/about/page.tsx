"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getServerCount, getTotalPlayers } from "@/lib/supabase/queries";

export default function AboutPage() {
  const [stats, setStats] = useState({
    serverCount: 0,
    totalPlayers: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const [serverCount, totalPlayers] = await Promise.all([
        getServerCount(),
        getTotalPlayers(),
      ]);
      setStats({ serverCount, totalPlayers });
    }
    fetchStats();
  }, []);

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      title: "Discover Servers",
      description: "Browse hundreds of Hytale servers with detailed information, player counts, and community reviews.",
      gradient: "from-hytale-500 to-hytale-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ),
      title: "Featured Servers",
      description: "Premium server promotion with featured carousel placement and highlighted listings.",
      gradient: "from-gold-500 to-gold-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      ),
      title: "Category Tags",
      description: "Find servers by gameplay type - SMP, RPG, Minigames, Factions, PvP, and more.",
      gradient: "from-crystal-500 to-crystal-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      ),
      title: "Community Voting",
      description: "Vote for your favorite servers to help them climb the rankings.",
      gradient: "from-forest-500 to-forest-400",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      title: "Verified Servers",
      description: "Look for the verified badge to find servers that have been authenticated by our team.",
      gradient: "from-hytale-400 to-forest-500",
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
      title: "Server Dashboard",
      description: "Manage your server listing, track statistics, and respond to community feedback.",
      gradient: "from-sky-500 to-sky-400",
    },
  ];

  const faqs = [
    {
      question: "How do rankings work?",
      answer: "Server rankings are determined by a combination of factors including player count, community votes, uptime, and overall activity. Featured servers receive additional visibility but don't affect organic rankings.",
    },
    {
      question: "How do I submit my server?",
      answer: "Click the 'Submit Server' button in the sidebar to add your server. You'll need to provide your server IP, name, description, and select relevant tags. Verification is available for established servers.",
    },
    {
      question: "What are Featured servers?",
      answer: "Featured servers are premium placements that appear in the carousel at the top of the homepage. This is a paid promotion option for server owners who want maximum visibility.",
    },
    {
      question: "How do I get my server verified?",
      answer: "Verification is available for servers that have been active for at least 30 days and meet our quality standards. Apply through your server dashboard once your server is listed.",
    },
    {
      question: "Is HyRank free to use?",
      answer: "Yes! Browsing, searching, and basic server listing is completely free. Premium features like Featured placement and enhanced analytics are optional paid upgrades.",
    },
    {
      question: "How often are player counts updated?",
      answer: "Player counts are updated in real-time by pinging servers every few minutes. The data you see reflects the current state of each server.",
    },
  ];

  const displayStats = [
    { value: stats.serverCount.toString(), label: "Servers Listed" },
    { value: stats.totalPlayers.toLocaleString(), label: "Players Online" },
    { value: "10+", label: "Categories" },
    { value: "100K+", label: "Daily Visitors" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
      {/* Hero Section */}
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="badge-teal">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            About Us
          </span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
          About <span className="bg-gradient-to-r from-hytale-400 to-hytale-300 bg-clip-text text-transparent">HyRank</span>
        </h1>
        <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
          The premier server list for the Hytale community. Discover, compare, and connect to the best servers in the Alterverse.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="card p-8 mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {displayStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
            >
              <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-hytale-400 to-hytale-300 bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <div className="text-white/50 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="badge-gold">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Features
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-white">
            What We Offer
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative p-6 rounded-2xl bg-night-800/60 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
            >
              {/* Hover glow */}
              <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl`} />

              <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-hytale-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="badge-teal">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
            FAQ
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold text-white">
            Common Questions
          </h2>
        </div>
        <div className="space-y-4 max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.question}
              className="card-hover p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.05 }}
            >
              <h3 className="text-lg font-semibold text-white mb-3 flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-hytale-500/15 text-hytale-400 text-xs font-bold shrink-0">
                  Q
                </span>
                {faq.question}
              </h3>
              <p className="text-white/50 leading-relaxed pl-9">
                {faq.answer}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        className="relative card-premium p-10 text-center overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-hytale-500/10 via-transparent to-gold-500/10 pointer-events-none" />

        <div className="relative">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Ready to list your server?
          </h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto leading-relaxed">
            Join thousands of server owners who trust HyRank to connect them with players across the Alterverse.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/rankings"
              className="btn-primary"
            >
              Browse Servers
            </Link>
            <button className="btn-secondary">
              Submit Your Server
            </button>
          </div>
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div
        className="mt-12 text-center text-white/40 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <p>
          Have questions or feedback? Contact us at{" "}
          <a href="mailto:support@hyrank.gg" className="text-hytale-400 hover:text-hytale-300 transition-colors">
            support@hyrank.gg
          </a>
        </p>
      </motion.div>
    </div>
  );
}
