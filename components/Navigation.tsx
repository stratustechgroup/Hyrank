"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SubmitServerModal from "@/components/SubmitServerModal";
import UserMenu from "@/components/auth/UserMenu";

// Navigation links
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/rankings", label: "Rankings" },
  { href: "/tags", label: "Categories" },
  { href: "/about", label: "About" },
];

// Hytale-style logo
function HyRankLogo() {
  return (
    <Link href="/" className="group flex items-center gap-2">
      {/* Icon */}
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          {/* Outer glow */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e6b8" />
              <stop offset="50%" stopColor="#4dffdc" />
              <stop offset="100%" stopColor="#00b38f" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Shield shape */}
          <path
            d="M20 2 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 L20 2Z"
            fill="url(#logoGradient)"
            filter="url(#glow)"
            className="group-hover:scale-105 transition-transform origin-center"
          />
          {/* Inner H */}
          <path
            d="M14 12 L14 28 M14 20 L26 20 M26 12 L26 28"
            stroke="#0a0a12"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {/* Animated ring on hover */}
        <div className="absolute inset-0 rounded-full border-2 border-hytale-400/0 group-hover:border-hytale-400/50 group-hover:scale-125 transition-all duration-300" />
      </div>

      {/* Text */}
      <span className="font-display text-xl font-bold">
        <span className="text-white">Hy</span>
        <span className="text-hytale-400">Rank</span>
        <span className="text-white/50">.gg</span>
      </span>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/rankings?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className={`nav transition-all duration-300 ${
          isScrolled
            ? "bg-night-950/95 backdrop-blur-xl shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="nav-container">
          {/* Logo */}
          <HyRankLogo />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link relative ${
                  isActive(link.href) ? "nav-link-active" : ""
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-hytale-400 to-hytale-500 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Search servers"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>

            {/* Submit Server button - Desktop */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="hidden sm:flex btn-primary"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Submit Server
            </button>

            {/* User menu */}
            <UserMenu compact />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-night-950/80 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              className="fixed top-16 inset-x-0 bottom-0 z-40 md:hidden bg-night-900/95 backdrop-blur-xl border-t border-white/5"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="p-6 space-y-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-lg font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-hytale-500/10 text-hytale-400"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Submit button in mobile menu */}
                <div className="pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsSubmitModalOpen(true);
                    }}
                    className="w-full btn-primary btn-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Submit Your Server
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-night-950/80 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="card overflow-hidden shadow-2xl shadow-hytale-500/10">
                <form onSubmit={handleSearch} className="flex items-center gap-4 p-5 border-b border-white/5">
                  <svg className="w-5 h-5 text-hytale-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search servers by name, tag, or IP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-lg"
                  />
                  <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono text-white/40 bg-night-800 rounded-lg border border-white/5">
                    ESC
                  </kbd>
                </form>

                {/* Quick actions */}
                <div className="p-5">
                  <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                    Quick Actions
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        router.push("/rankings");
                        setIsSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <svg className="w-5 h-5 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                      <span>View Top Ranked Servers</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push("/tags");
                        setIsSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <svg className="w-5 h-5 text-crystal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                        <circle cx="7" cy="7" r="1.5" fill="currentColor" />
                      </svg>
                      <span>Browse by Category</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsSearchOpen(false);
                        setIsSubmitModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <svg className="w-5 h-5 text-hytale-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                      </svg>
                      <span>Submit Your Server</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Submit Server Modal */}
      <SubmitServerModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </>
  );
}
