"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SubmitServerModal from "@/components/SubmitServerModal";
import UserMenu from "@/components/auth/UserMenu";
import Logo, { LogoIcon } from "@/components/ui/Logo";

interface AppShellProps {
  children: React.ReactNode;
}

// Navigation structure with sections
const NAV_SECTIONS = [
  {
    label: "DISCOVER",
    items: [
      { href: "/", label: "Browse Servers", icon: "grid", description: "Explore all servers" },
      { href: "/rankings", label: "Top Rankings", icon: "trophy", description: "View top servers" },
      { href: "/tags", label: "Categories", icon: "tag", description: "Browse by category" },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", description: "Manage your servers" },
      { href: "/favorites", label: "Favorites", icon: "heart", description: "Saved servers" },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { href: "/about", label: "About", icon: "info", description: "Learn about HyRank" },
    ],
  },
];

// Premium icon component with glow effects
function NavIcon({ icon, className = "w-5 h-5", active = false }: { icon: string; className?: string; active?: boolean }) {
  const baseClass = className;
  const activeClass = active ? "text-hytale-400" : "";

  const icons: Record<string, JSX.Element> = {
    grid: (
      <svg className={`${baseClass} ${activeClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
      </svg>
    ),
    trophy: (
      <svg className={`${baseClass} ${activeClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
    tag: (
      <svg className={`${baseClass} ${activeClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      </svg>
    ),
    info: (
      <svg className={`${baseClass} ${activeClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <circle cx="12" cy="8" r="0.5" fill="currentColor" />
      </svg>
    ),
    dashboard: (
      <svg className={`${baseClass} ${activeClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </svg>
    ),
    heart: (
      <svg className={`${baseClass} ${activeClass}`} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
    search: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    chevronLeft: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m15 18-6-6 6-6" />
      </svg>
    ),
    chevronRight: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m9 18 6-6-6-6" />
      </svg>
    ),
    plus: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    rocket: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
    menu: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    ),
    close: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    sparkles: (
      <svg className={baseClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3v2m0 14v2M5.636 5.636l1.414 1.414m9.9 9.9l1.414 1.414M3 12h2m14 0h2M5.636 18.364l1.414-1.414m9.9-9.9l1.414-1.414" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  };
  return icons[icon] || null;
}

// Premium tooltip with glassmorphism
function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {show && isHovered && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50"
          >
            <div className="px-3 py-2 text-sm font-medium text-platinum-100 bg-surface-200/95 backdrop-blur-xl rounded-lg whitespace-nowrap shadow-xl border border-white/[0.08]">
              {label}
              {/* Arrow */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-surface-200/95 border-l border-b border-white/[0.08] rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STORAGE_KEY = "hyrank-sidebar-collapsed";

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Determine if a link is active
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/rankings?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Sidebar width based on collapsed state
  const effectiveCollapsed = mounted && isCollapsed;
  const sidebarWidth = effectiveCollapsed ? 72 : 280;

  return (
    <div className="min-h-screen flex bg-surface-0">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-30" />

        {/* Aurora orbs */}
        <div
          className="absolute -top-[300px] -left-[200px] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-[200px] -right-[150px] w-[500px] h-[500px] rounded-full blur-[100px] opacity-15"
          style={{ background: "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)" }}
        />
      </div>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-40"
        style={{
          width: sidebarWidth,
          transition: "width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Sidebar background with glassmorphism */}
        <div className="absolute inset-0 bg-surface-50/95 backdrop-blur-xl border-r border-white/[0.06]" />

        {/* Sidebar content */}
        <div className="relative flex flex-col h-full">
          {/* Header with Logo and Collapse Toggle */}
          <div className="h-[72px] flex items-center justify-between px-4 border-b border-white/[0.06]">
            {effectiveCollapsed ? (
              <Link href="/" className="flex items-center justify-center w-full">
                <LogoIcon size={40} />
              </Link>
            ) : (
              <Logo size="md" animated={false} />
            )}

            {/* Collapse Toggle Button - Only show when expanded */}
            {!effectiveCollapsed && (
              <button
                onClick={toggleCollapsed}
                className="p-2 rounded-lg text-platinum-500 hover:text-platinum-300 hover:bg-surface-200/60 transition-all duration-200"
                aria-label="Collapse sidebar"
              >
                <NavIcon icon="chevronLeft" className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand button when collapsed */}
          {effectiveCollapsed && (
            <div className="px-3 py-3 border-b border-white/[0.06]">
              <Tooltip label="Expand sidebar" show={effectiveCollapsed}>
                <button
                  onClick={toggleCollapsed}
                  className="w-full p-2.5 rounded-xl bg-surface-200/60 text-platinum-400 hover:text-platinum-200 hover:bg-surface-300/60 transition-all duration-200 flex items-center justify-center"
                >
                  <NavIcon icon="chevronRight" className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Search Bar */}
          <div className="px-3 py-3 border-b border-white/[0.06]">
            {effectiveCollapsed ? (
              <Tooltip label="Search servers (⌘K)" show={effectiveCollapsed}>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="w-full p-2.5 rounded-xl bg-surface-200/60 text-platinum-400 hover:text-hytale-400 hover:bg-surface-300/60 transition-all duration-200 flex items-center justify-center group"
                >
                  <NavIcon icon="search" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-200/60 text-platinum-400 hover:bg-surface-300/60 hover:text-platinum-300 transition-all duration-200 text-left group border border-white/[0.04] hover:border-white/[0.08]"
              >
                <NavIcon icon="search" className="w-4 h-4 group-hover:text-hytale-400 transition-colors" />
                <span className="text-sm flex-1">Search servers...</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-platinum-600 bg-surface-300/60 rounded">
                  ⌘K
                </kbd>
              </button>
            )}
          </div>

          {/* Navigation Sections */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin py-4">
            {NAV_SECTIONS.map((section, sectionIndex) => (
              <div key={section.label} className={sectionIndex > 0 ? "mt-6" : ""}>
                {/* Section Label - Hide when collapsed */}
                {!effectiveCollapsed && (
                  <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-platinum-600">
                    {section.label}
                  </div>
                )}

                {/* Section Items */}
                <div className={`space-y-1 ${effectiveCollapsed ? "px-3" : "px-3"}`}>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Tooltip key={item.href} label={item.label} show={effectiveCollapsed}>
                        <Link
                          href={item.href}
                          className={`
                            relative flex items-center gap-3 rounded-xl transition-all duration-200 group
                            ${effectiveCollapsed ? "p-2.5 justify-center" : "px-4 py-2.5"}
                            ${active
                              ? "bg-hytale-500/10 text-hytale-400"
                              : "text-platinum-400 hover:bg-surface-200/60 hover:text-platinum-200"
                            }
                          `}
                        >
                          {/* Active indicator */}
                          {active && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-hytale-400 to-hytale-500"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}

                          <NavIcon
                            icon={item.icon}
                            className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${active ? "" : "group-hover:scale-110"}`}
                            active={active}
                          />
                          {!effectiveCollapsed && (
                            <span className="text-sm font-medium">{item.label}</span>
                          )}
                        </Link>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer with Submit Button and User Menu */}
          <div className="border-t border-white/[0.06] p-3 space-y-3">
            {/* Submit Server Button */}
            <Tooltip label="Submit Your Server" show={effectiveCollapsed}>
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className={`
                  w-full flex items-center justify-center gap-2.5 rounded-xl font-semibold
                  bg-gradient-to-r from-hytale-500 to-hytale-600 text-white
                  shadow-lg shadow-hytale-500/25 hover:shadow-xl hover:shadow-hytale-500/35
                  hover:from-hytale-400 hover:to-hytale-500
                  transition-all duration-200 group
                  ${effectiveCollapsed ? "p-3" : "px-4 py-3"}
                `}
              >
                <NavIcon icon="rocket" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {!effectiveCollapsed && <span>Submit Server</span>}
              </button>
            </Tooltip>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* User Menu */}
            <div className={`${effectiveCollapsed ? "flex justify-center" : ""}`}>
              <UserMenu compact={effectiveCollapsed} />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 z-40">
        {/* Background with blur */}
        <div className="absolute inset-0 bg-surface-50/90 backdrop-blur-xl border-b border-white/[0.06]" />

        <div className="relative h-full flex items-center justify-between px-4">
          <Logo size="sm" animated={false} />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 rounded-xl text-platinum-400 hover:text-hytale-400 hover:bg-surface-200/60 transition-all"
            >
              <NavIcon icon="search" className="w-5 h-5" />
            </button>
            <UserMenu compact />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl text-platinum-400 hover:text-platinum-200 hover:bg-surface-200/60 transition-all"
            >
              <NavIcon icon={isMobileMenuOpen ? "close" : "menu"} className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 bg-surface-0/80 backdrop-blur-sm z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed top-16 left-0 right-0 bottom-0 bg-surface-50/95 backdrop-blur-xl z-30 overflow-y-auto"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <nav className="p-5 space-y-8">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.label}>
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-platinum-600">
                      {section.label}
                    </div>
                    <div className="space-y-1 mt-2">
                      {section.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`
                              relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all
                              ${active
                                ? "bg-hytale-500/10 text-hytale-400"
                                : "text-platinum-400 hover:bg-surface-200/60 hover:text-platinum-200"
                              }
                            `}
                          >
                            {active && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-hytale-400 to-hytale-500" />
                            )}
                            <NavIcon icon={item.icon} className="w-5 h-5" active={active} />
                            <div>
                              <span className="font-medium block">{item.label}</span>
                              <span className="text-xs text-platinum-500">{item.description}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="p-5 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsSubmitModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-hytale-500 to-hytale-600 text-white shadow-lg shadow-hytale-500/25"
                >
                  <NavIcon icon="rocket" className="w-5 h-5" />
                  <span>Submit Your Server</span>
                </button>
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
              className="fixed inset-0 bg-surface-0/80 backdrop-blur-sm z-50"
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
              <div className="bg-surface-100/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                {/* Search header */}
                <form onSubmit={handleSearch} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06]">
                  <NavIcon icon="search" className="w-5 h-5 text-hytale-400" />
                  <input
                    type="text"
                    placeholder="Search servers by name, tag, or IP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent text-platinum-100 placeholder-platinum-500 outline-none text-base"
                  />
                  <div className="flex items-center gap-2">
                    <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono text-platinum-500 bg-surface-200/80 rounded-lg border border-white/[0.05]">
                      ESC
                    </kbd>
                  </div>
                </form>

                {/* Search hints */}
                <div className="p-5">
                  <div className="text-xs font-medium text-platinum-500 mb-3">QUICK ACTIONS</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => { router.push("/rankings"); setIsSearchOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-platinum-400 hover:bg-surface-200/60 hover:text-platinum-200 transition-all text-left"
                    >
                      <NavIcon icon="trophy" className="w-4 h-4 text-gold-400" />
                      <span className="text-sm">View Top Ranked Servers</span>
                    </button>
                    <button
                      onClick={() => { router.push("/tags"); setIsSearchOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-platinum-400 hover:bg-surface-200/60 hover:text-platinum-200 transition-all text-left"
                    >
                      <NavIcon icon="tag" className="w-4 h-4 text-royal-400" />
                      <span className="text-sm">Browse by Category</span>
                    </button>
                    <button
                      onClick={() => { setIsSearchOpen(false); setIsSubmitModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-platinum-400 hover:bg-surface-200/60 hover:text-platinum-200 transition-all text-left"
                    >
                      <NavIcon icon="rocket" className="w-4 h-4 text-hytale-400" />
                      <span className="text-sm">Submit Your Server</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main
        className="flex-1 min-h-screen"
        style={{
          marginLeft: mounted ? sidebarWidth : 280,
          transition: "margin-left 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Mobile top padding */}
        <div className="lg:hidden h-16" />
        {/* Desktop needs no padding since sidebar is fixed */}
        <div className="hidden lg:block" />
        {children}
      </main>

      {/* Submit Server Modal */}
      <SubmitServerModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
}
