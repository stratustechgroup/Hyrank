import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===========================================
        // HYRANK HYTALE-THEMED DESIGN SYSTEM
        // Inspired by Hytale's vibrant world
        // ===========================================

        // Deep night sky backgrounds
        night: {
          950: "#0a0a12",
          900: "#0d0d18",
          850: "#10101f",
          800: "#141425",
          750: "#18182d",
          700: "#1e1e38",
          600: "#2a2a4a",
          500: "#3a3a5a",
        },

        // Legacy surface colors (for compatibility)
        surface: {
          0: "#0a0a12",
          50: "#0d0d18",
          100: "#10101f",
          200: "#141425",
          300: "#18182d",
          400: "#1e1e38",
          500: "#2a2a4a",
        },

        // Legacy platinum colors (for compatibility)
        platinum: {
          50: "#ffffff",
          100: "#f5f5f7",
          200: "#e5e5e9",
          300: "#b8b8c4",
          400: "#8b8b9e",
          500: "#5e5e78",
          600: "#3a3a52",
        },

        // Hytale Teal - Primary brand color
        hytale: {
          50: "#e6fffa",
          100: "#b3fff0",
          200: "#80ffe6",
          300: "#4dffdc",
          400: "#1affd2",
          500: "#00e6b8", // Main accent
          600: "#00b38f",
          700: "#008066",
          800: "#004d3d",
          900: "#001a14",
        },

        // Ember Orange - Secondary accent
        ember: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // Warm accent
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },

        // Crystal Purple - Tertiary accent
        crystal: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7", // Magic accent
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },

        // Sky Blue - Info/links
        sky: {
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },

        // Forest Green - Success/Online
        forest: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },

        // Crimson Red - Error/Offline
        crimson: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
        },

        // Gold - Premium/Featured
        gold: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },

        // ===========================================
        // LEGACY ALIASES — pre-rebrand coming-soon phase
        // Points at current palette entries for backward compat.
        // Components referencing void-*/adventure-*/legendary-* render correctly.
        // ===========================================
        void: {
          950: "#0a0a12",
          900: "#0d0d18",
          850: "#10101f",
          800: "#141425",
          750: "#18182d",
          700: "#1e1e38",
          600: "#2a2a4a",
          500: "#3a3a5a",
        },
        adventure: {
          50: "#e6fffa",
          100: "#b3fff0",
          200: "#80ffe6",
          300: "#4dffdc",
          400: "#1affd2",
          500: "#00e6b8",
          600: "#00b38f",
          700: "#008066",
          800: "#004d3d",
          900: "#001a14",
        },
        legendary: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        electric: {
          50: "#e6fffa",
          100: "#b3fff0",
          200: "#80ffe6",
          300: "#4dffdc",
          400: "#1affd2",
          500: "#00e6b8",
          600: "#00b38f",
          700: "#008066",
          800: "#004d3d",
          900: "#001a14",
        },
        royal: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        status: {
          online: "#22c55e",
          offline: "#ef4444",
          unknown: "#5e5e78",
        },
      },

      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },

      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
      },

      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },

      boxShadow: {
        "glow-teal": "0 0 60px rgba(0, 230, 184, 0.4)",
        "glow-teal-sm": "0 0 30px rgba(0, 230, 184, 0.3)",
        "glow-orange": "0 0 60px rgba(249, 115, 22, 0.4)",
        "glow-purple": "0 0 60px rgba(168, 85, 247, 0.4)",
        "glow-gold": "0 0 60px rgba(251, 191, 36, 0.4)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        "card": "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
      },

      animation: {
        // Floating elements
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",

        // Glowing effects
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",

        // Particles
        "particle-rise": "particle-rise 8s ease-out infinite",
        "particle-drift": "particle-drift 15s linear infinite",

        // Character animations
        "bob": "bob 3s ease-in-out infinite",
        "sway": "sway 4s ease-in-out infinite",

        // UI animations
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "spin-slow": "spin 8s linear infinite",

        // Background
        "gradient-shift": "gradient-shift 15s ease infinite",
        "aurora": "aurora 20s ease infinite",

        // Plan 5 additions
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },

      keyframes: {
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "particle-rise": {
          "0%": { transform: "translateY(100vh) scale(0)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(-100vh) scale(1)", opacity: "0" },
        },
        "particle-drift": {
          "0%": { transform: "translate(0, 0) rotate(0deg)" },
          "25%": { transform: "translate(100px, -50px) rotate(90deg)" },
          "50%": { transform: "translate(50px, -100px) rotate(180deg)" },
          "75%": { transform: "translate(-50px, -50px) rotate(270deg)" },
          "100%": { transform: "translate(0, 0) rotate(360deg)" },
        },
        "bob": {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
        "sway": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "aurora": {
          "0%": { transform: "translate(0%, 0%) rotate(0deg)" },
          "50%": { transform: "translate(10%, 5%) rotate(180deg)" },
          "100%": { transform: "translate(0%, 0%) rotate(360deg)" },
        },
      },

      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hytale": "linear-gradient(135deg, var(--tw-gradient-stops))",
        "hero-pattern": `
          radial-gradient(at 40% 20%, rgba(0, 230, 184, 0.15) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(168, 85, 247, 0.1) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(249, 115, 22, 0.1) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(0, 230, 184, 0.08) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(168, 85, 247, 0.08) 0px, transparent 50%)
        `,
      },
    },
  },
  plugins: [],
};

export default config;
