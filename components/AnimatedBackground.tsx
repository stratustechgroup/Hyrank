"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// Magical particle that floats upward with a slight glow
function MagicParticle({ delay, x, size, color }: { delay: number; x: number; size: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: "-5%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
      initial={{ opacity: 0, y: 0 }}
      animate={{
        opacity: [0, 0.8, 0.6, 0],
        y: [0, -window?.innerHeight * 1.2 || -1000],
        x: [0, Math.sin(delay) * 50, Math.cos(delay) * 30, 0],
      }}
      transition={{
        duration: 12 + delay * 2,
        delay: delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

// Floating crystal formation - Hytale style
function FloatingCrystal({ className, color, delay }: { className?: string; color: string; delay: number }) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0.3, 0.6, 0.3],
        y: [0, -15, 0],
        rotate: [0, 3, 0],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg viewBox="0 0 60 80" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id={`crystal-${delay}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
          <filter id={`glow-${delay}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Main crystal */}
        <polygon
          points="30,0 55,25 30,80 5,25"
          fill={`url(#crystal-${delay})`}
          filter={`url(#glow-${delay})`}
        />
        {/* Inner highlight */}
        <polygon
          points="30,5 48,25 30,70"
          fill="rgba(255,255,255,0.15)"
        />
        {/* Facet line */}
        <line x1="30" y1="12" x2="30" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
}

// Hytale-style floating island silhouette
function FloatingIsland({ className, delay }: { className?: string; delay: number }) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      animate={{
        y: [0, -8, 0],
        rotate: [0, 0.5, 0],
      }}
      transition={{
        duration: 10 + delay * 2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg viewBox="0 0 200 120" fill="currentColor" className="w-full h-full drop-shadow-2xl">
        {/* Island base - rocky bottom */}
        <path
          d="M20,70 Q30,60 50,65 Q80,55 100,60 Q130,50 150,58 Q175,52 180,65 L185,85 Q175,100 150,105 Q120,115 100,110 Q70,118 50,108 Q25,105 15,90 Z"
          fill="currentColor"
          opacity="0.3"
        />
        {/* Island top - grass/ground */}
        <path
          d="M25,68 Q40,60 60,62 Q90,52 100,55 Q125,48 150,55 Q170,50 175,60 L175,70 Q160,75 130,72 Q100,78 70,73 Q45,78 25,72 Z"
          fill="currentColor"
          opacity="0.5"
        />
        {/* Trees silhouettes */}
        <ellipse cx="60" cy="50" rx="15" ry="20" opacity="0.6" />
        <ellipse cx="90" cy="45" rx="12" ry="18" opacity="0.5" />
        <ellipse cx="120" cy="48" rx="18" ry="22" opacity="0.6" />
        <ellipse cx="145" cy="52" rx="10" ry="15" opacity="0.4" />
        {/* Tower/structure */}
        <rect x="95" y="25" width="12" height="30" opacity="0.4" rx="1" />
        <polygon points="95,25 101,15 107,25" opacity="0.5" />
      </svg>
    </motion.div>
  );
}

// Distant mountain range silhouette
function MountainRange({ className, layer }: { className?: string; layer: 1 | 2 | 3 }) {
  const opacities = { 1: 0.08, 2: 0.05, 3: 0.03 };

  return (
    <div className={`absolute bottom-0 left-0 right-0 pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1440 320"
        fill="currentColor"
        className="w-full"
        style={{ opacity: opacities[layer] }}
        preserveAspectRatio="none"
      >
        {layer === 1 && (
          <path d="M0,320 L0,200 Q80,150 120,180 Q180,120 240,160 Q320,80 400,140 Q500,60 600,120 Q720,40 800,100 Q900,20 1000,80 Q1100,40 1200,90 Q1280,50 1350,100 Q1400,60 1440,80 L1440,320 Z" />
        )}
        {layer === 2 && (
          <path d="M0,320 L0,220 Q100,180 180,200 Q280,140 380,180 Q500,100 620,150 Q750,80 880,140 Q1000,60 1120,120 Q1240,70 1350,110 Q1400,90 1440,100 L1440,320 Z" />
        )}
        {layer === 3 && (
          <path d="M0,320 L0,250 Q150,210 280,230 Q420,180 560,210 Q720,160 880,200 Q1050,150 1200,190 Q1340,160 1440,180 L1440,320 Z" />
        )}
      </svg>
    </div>
  );
}

// Ambient light rays
function LightRays() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute -top-1/2 left-1/4 w-[600px] h-[800px]"
        style={{
          background: "linear-gradient(180deg, rgba(0,230,184,0.03) 0%, transparent 100%)",
          transform: "rotate(-15deg)",
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -top-1/2 right-1/4 w-[400px] h-[700px]"
        style={{
          background: "linear-gradient(180deg, rgba(168,85,247,0.02) 0%, transparent 100%)",
          transform: "rotate(20deg)",
        }}
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 10,
          delay: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Star field for depth
function StarField() {
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 60,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            width: star.size,
            height: star.size,
            left: `${star.x}%`,
            top: `${star.y}%`,
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Particle colors matching Hytale palette
  const particleColors = [
    "rgba(0,230,184,0.6)",   // Hytale teal
    "rgba(168,85,247,0.5)",  // Crystal purple
    "rgba(249,115,22,0.4)",  // Ember orange
    "rgba(34,197,94,0.4)",   // Forest green
  ];

  return (
    <div ref={containerRef} className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep space gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              #050508 0%,
              #0a0a12 20%,
              #0d0d1a 40%,
              #0f0f1f 60%,
              #121222 80%,
              #141428 100%
            )
          `,
        }}
      />

      {/* Star field */}
      <StarField />

      {/* Subtle nebula effect */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 20% 10%, rgba(0,230,184,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 80%, rgba(249,115,22,0.04) 0%, transparent 40%)
          `,
        }}
      />

      {/* Light rays from top */}
      <LightRays />

      {/* Distant mountain layers - parallax depth */}
      <MountainRange layer={3} className="text-hytale-600" />
      <MountainRange layer={2} className="text-crystal-700" />
      <MountainRange layer={1} className="text-night-700" />

      {/* Floating islands - hidden on mobile for performance */}
      <div className="hidden md:block">
        <FloatingIsland
          className="w-48 h-28 text-hytale-500/10 top-[15%] left-[5%]"
          delay={0}
        />
        <FloatingIsland
          className="w-32 h-20 text-crystal-500/8 top-[25%] right-[10%]"
          delay={2}
        />
        <FloatingIsland
          className="w-24 h-14 text-ember-500/6 top-[45%] left-[75%]"
          delay={4}
        />
      </div>

      {/* Floating crystals */}
      <div className="hidden lg:block">
        <FloatingCrystal
          className="w-10 h-14 top-[20%] left-[12%]"
          color="#00e6b8"
          delay={0}
        />
        <FloatingCrystal
          className="w-8 h-10 top-[35%] right-[15%]"
          color="#a855f7"
          delay={1.5}
        />
        <FloatingCrystal
          className="w-6 h-8 top-[55%] left-[80%]"
          color="#f97316"
          delay={3}
        />
        <FloatingCrystal
          className="w-12 h-16 top-[65%] left-[8%]"
          color="#a855f7"
          delay={2}
        />
      </div>

      {/* Ambient magic particles */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <MagicParticle
              key={i}
              delay={i * 0.8}
              x={5 + (i * 6.5)}
              size={3 + Math.random() * 4}
              color={particleColors[i % particleColors.length]}
            />
          ))}
        </div>
      )}

      {/* Subtle grid overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 70%)",
        }}
      />

      {/* Vignette effect for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, rgba(5,5,8,0.4) 100%)",
        }}
      />

      {/* Subtle animated aurora */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: `
            linear-gradient(
              135deg,
              transparent 0%,
              rgba(0,230,184,0.02) 20%,
              transparent 40%,
              rgba(168,85,247,0.02) 60%,
              transparent 80%,
              rgba(0,230,184,0.01) 100%
            )
          `,
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
