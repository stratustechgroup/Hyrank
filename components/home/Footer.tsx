"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const footerLinks = {
  discover: [
    { label: "Browse Servers", href: "/rankings" },
    { label: "Categories", href: "/tags" },
    { label: "Top Ranked", href: "/rankings?sort=rank" },
    { label: "New Servers", href: "/rankings?sort=newest" },
  ],
  resources: [
    { label: "About Us", href: "/about" },
    { label: "Submit Server", href: "/submit" },
    { label: "API Documentation", href: "/docs/api" },
    { label: "Server Guidelines", href: "/guidelines" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
  social: [
    { label: "Discord", href: "https://discord.gg/hyrank", icon: "discord" },
    { label: "Twitter", href: "https://twitter.com/hyrank", icon: "twitter" },
    { label: "GitHub", href: "https://github.com/hyrank", icon: "github" },
  ],
};

const socialIcons: Record<string, JSX.Element> = {
  discord: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  github: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  ),
};

// Hytale-style logo for footer
function FooterLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <defs>
            <linearGradient id="footerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e6b8" />
              <stop offset="100%" stopColor="#00b38f" />
            </linearGradient>
          </defs>
          <path
            d="M20 2 L36 10 L36 22 C36 30 28 36 20 38 C12 36 4 30 4 22 L4 10 L20 2Z"
            fill="url(#footerLogoGrad)"
          />
          <path
            d="M14 12 L14 28 M14 20 L26 20 M26 12 L26 28"
            stroke="#0a0a12"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
      <span className="font-display text-xl font-bold">
        <span className="text-white">Hy</span>
        <span className="text-hytale-400">Rank</span>
        <span className="text-white/50">.gg</span>
      </span>
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="footer">
      {/* Gradient orb */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -bottom-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: "radial-gradient(circle, rgba(0, 230, 184, 0.3) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <FooterLogo />
            <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
              The definitive Hytale server list. Discover, compare, and join the best gaming communities.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {footerLinks.social.map((item) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-night-800/80 text-white/50 hover:text-hytale-400 hover:bg-night-700 transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={item.label}
                >
                  {socialIcons[item.icon]}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
              Discover
            </h3>
            <ul className="space-y-3">
              {footerLinks.discover.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-hytale-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-hytale-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-hytale-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
              Stay Updated
            </h3>
            <p className="text-sm text-white/50 mb-4">
              Get notified about new servers and features.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="input flex-1 text-sm py-2.5"
              />
              <button className="btn-primary px-4 py-2.5 text-sm">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="divider mb-8" />

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>&copy; {new Date().getFullYear()} HyRank.gg</span>
            <span>|</span>
            <span>All rights reserved</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-white/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-500" />
              </span>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
