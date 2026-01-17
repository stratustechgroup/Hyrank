"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SERVER_TAGS, type ServerTag } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthContext";

interface SubmitServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  ip: string;
  bannerUrl: string;
  tags: ServerTag[];
  description: string;
}

export default function SubmitServerModal({
  isOpen,
  onClose,
}: SubmitServerModalProps) {
  const { user, isLoading: authLoading, signInWithGoogle, signInWithDiscord } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    ip: "",
    bannerUrl: "",
    tags: [],
    description: "",
  });
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [authError, setAuthError] = useState<string | null>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setFormData({
          name: "",
          ip: "",
          bannerUrl: "",
          tags: [],
          description: "",
        });
        setBannerPreview(null);
        setBannerError(false);
        setStatus("idle");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle banner URL change with preview
  const handleBannerUrlChange = (url: string) => {
    setFormData((prev) => ({ ...prev, bannerUrl: url }));
    setBannerError(false);

    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setBannerPreview(url);
    } else {
      setBannerPreview(null);
    }
  };

  // Toggle tag selection
  const toggleTag = (tag: ServerTag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : prev.tags.length < 5
          ? [...prev.tags, tag]
          : prev.tags,
    }));
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleDiscordSignIn = async () => {
    setAuthError(null);
    const { error } = await signInWithDiscord();
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Submit server:", formData);
    setStatus("success");

    // Close after success animation
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - darker and more blur */}
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg bg-[#0f1218] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors z-10"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div className="p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  {/* Loading auth state */}
                  {authLoading ? (
                    <motion.div
                      key="loading"
                      className="text-center py-12"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="w-12 h-12 mx-auto mb-4 border-2 border-white/20 border-t-hytale-400 rounded-full animate-spin" />
                      <p className="text-white/60">Loading...</p>
                    </motion.div>
                  ) : !user ? (
                    /* Login Required */
                    <motion.div
                      key="login"
                      className="text-center py-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-hytale-500/20 flex items-center justify-center">
                        <svg
                          className="w-10 h-10 text-hytale-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Sign In Required</h3>
                      <p className="text-white/50 mb-6 max-w-sm mx-auto">
                        Please sign in to submit your server to HyRank.gg
                      </p>

                      {authError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                          {authError}
                        </div>
                      )}

                      <div className="space-y-3">
                        <button
                          onClick={handleGoogleSignIn}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-xl transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Continue with Google
                        </button>

                        <button
                          onClick={handleDiscordSignIn}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-colors"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                          </svg>
                          Continue with Discord
                        </button>
                      </div>
                    </motion.div>
                  ) : status === "success" ? (
                    <motion.div
                      key="success"
                      className="text-center py-8"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <motion.div
                        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-500/20 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                      >
                        <svg
                          className="w-10 h-10 text-emerald-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <motion.path
                            d="M20 6L9 17l-5-5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                          />
                        </svg>
                      </motion.div>
                      <h3 className="text-2xl font-bold text-white mb-2">Server Submitted!</h3>
                      <p className="text-white/50">Your server is pending review.</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Header */}
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">
                          List Your Server
                        </h2>
                        <p className="text-white/50 text-sm">
                          Add your Hytale server to HyRank.gg
                        </p>
                      </div>

                      {/* Form */}
                      <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Banner Preview */}
                        <div className="aspect-video rounded-xl overflow-hidden bg-[#1a1d24] border border-white/5 relative">
                          <AnimatePresence mode="wait">
                            {bannerPreview && !bannerError ? (
                              <motion.img
                                key="preview"
                                src={bannerPreview}
                                alt="Banner preview"
                                className="w-full h-full object-cover"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onError={() => setBannerError(true)}
                              />
                            ) : (
                              <motion.div
                                key="placeholder"
                                className="w-full h-full flex flex-col items-center justify-center text-white/20"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <svg
                                  className="w-12 h-12 mb-2"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                >
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                                <span className="text-sm">Banner Preview</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Banner URL */}
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Banner URL
                          </label>
                          <input
                            type="url"
                            value={formData.bannerUrl}
                            onChange={(e) => handleBannerUrlChange(e.target.value)}
                            placeholder="https://example.com/banner.jpg"
                            className="w-full px-4 py-3 bg-[#1a1d24] border border-white/10 rounded-xl text-white placeholder-white/30 outline-none focus:border-hytale-500/50 transition-colors"
                          />
                        </div>

                        {/* Server Name */}
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Server Name <span className="text-hytale-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="My Awesome Server"
                            required
                            className="w-full px-4 py-3 bg-[#1a1d24] border border-white/10 rounded-xl text-white placeholder-white/30 outline-none focus:border-hytale-500/50 transition-colors"
                          />
                        </div>

                        {/* Server IP */}
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Server IP <span className="text-hytale-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.ip}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, ip: e.target.value }))
                            }
                            placeholder="play.example.gg"
                            required
                            className="w-full px-4 py-3 bg-[#1a1d24] border border-white/10 rounded-xl text-white placeholder-white/30 outline-none focus:border-hytale-500/50 transition-colors"
                          />
                        </div>

                        {/* Tag Selector Grid */}
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-3">
                            Tags <span className="text-white/40 font-normal">(select up to 5)</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {SERVER_TAGS.map((tag) => {
                              const isSelected = formData.tags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleTag(tag)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isSelected
                                      ? "bg-hytale-500 text-white"
                                      : "bg-[#1a1d24] text-white/60 hover:text-white hover:bg-[#22262e] border border-white/5"
                                  }`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={status === "loading"}
                          className="w-full py-4 bg-gradient-to-r from-hytale-500 to-hytale-600 hover:from-hytale-400 hover:to-hytale-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-hytale-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {status === "loading" ? (
                            <>
                              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Submitting...
                            </>
                          ) : (
                            <>
                              Submit Server
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
