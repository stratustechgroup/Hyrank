"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SERVER_TYPES = [
  { value: "", label: "Select server type (optional)" },
  { value: "smp", label: "SMP (Survival Multiplayer)" },
  { value: "rpg", label: "RPG (Role-Playing)" },
  { value: "minigames", label: "Minigames" },
  { value: "factions", label: "Factions" },
  { value: "creative", label: "Creative" },
];

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  serverName: string;
  serverType: string;
  email: string;
}

type FormStatus = "idle" | "loading" | "success" | "error";

export default function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    serverName: "",
    serverType: "",
    email: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setFormData({ name: "", serverName: "", serverType: "", email: "" });
        setStatus("idle");
        setErrorMessage("");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    // Validate email
    if (!formData.email || !formData.email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address");
      return;
    }

    try {
      // Submit to our API route (which forwards to Loops.so)
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.name || undefined,
          serverName: formData.serverName || undefined,
          serverType: formData.serverType || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit. Please try again.");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-void-950/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative glass-card-strong w-full max-w-md p-6 sm:p-8 overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative orbs */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-adventure-500 rounded-full blur-3xl opacity-20" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-legendary-500 rounded-full blur-3xl opacity-20" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Content */}
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    className="text-center py-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    {/* Success icon */}
                    <motion.div
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-adventure-500/20 to-adventure-600/20 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 300,
                        delay: 0.1,
                      }}
                    >
                      <motion.svg
                        className="w-10 h-10 text-adventure-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </motion.svg>
                    </motion.div>

                    <h3 className="text-2xl font-bold text-white mb-3">
                      Welcome to the Alterverse!
                    </h3>
                    <p className="text-white/60 mb-6">
                      You&apos;re on the list. We&apos;ll notify you when
                      HyRank.gg launches.
                    </p>

                    <button
                      onClick={onClose}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <span>Continue Exploring</span>
                      <svg
                        className="w-4 h-4"
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
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-legendary-500/10 border border-legendary-500/20 text-legendary-400 text-sm font-medium mb-4">
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Early Access
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Join the Waitlist
                      </h2>
                      <p className="text-white/50 text-sm">
                        Be among the first to experience HyRank.gg
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name */}
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-white/70 mb-2"
                        >
                          Your Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter your name"
                          className="input-glass"
                        />
                      </div>

                      {/* Server Name */}
                      <div>
                        <label
                          htmlFor="serverName"
                          className="block text-sm font-medium text-white/70 mb-2"
                        >
                          Server Name{" "}
                          <span className="text-white/40">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          id="serverName"
                          name="serverName"
                          value={formData.serverName}
                          onChange={handleInputChange}
                          placeholder="Your Hytale server name"
                          className="input-glass"
                        />
                      </div>

                      {/* Server Type */}
                      <div>
                        <label
                          htmlFor="serverType"
                          className="block text-sm font-medium text-white/70 mb-2"
                        >
                          Server Type{" "}
                          <span className="text-white/40">(Optional)</span>
                        </label>
                        <select
                          id="serverType"
                          name="serverType"
                          value={formData.serverType}
                          onChange={handleInputChange}
                          className="select-glass"
                        >
                          {SERVER_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Email */}
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-white/70 mb-2"
                        >
                          Email Address{" "}
                          <span className="text-adventure-400">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="you@example.com"
                          required
                          className="input-glass"
                        />
                      </div>

                      {/* Error message */}
                      {status === "error" && errorMessage && (
                        <motion.div
                          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {errorMessage}
                        </motion.div>
                      )}

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="btn-legendary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {status === "loading" ? (
                          <>
                            <svg
                              className="w-5 h-5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span>Joining...</span>
                          </>
                        ) : (
                          <>
                            <span>Join Waitlist</span>
                            <svg
                              className="w-5 h-5"
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
                          </>
                        )}
                      </button>
                    </form>

                    {/* Privacy note */}
                    <p className="mt-4 text-center text-xs text-white/30">
                      By joining, you agree to receive updates about HyRank.gg.
                      <br />
                      We respect your privacy and won&apos;t spam you.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
