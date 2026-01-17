"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-white/5 rounded-lg ${className}`}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function ServerCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      {/* Banner */}
      <Skeleton className="aspect-video rounded-none" />

      {/* Content */}
      <div className="p-4">
        {/* Title and players */}
        <div className="flex items-start justify-between mb-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-12" />
        </div>

        {/* Description */}
        <Skeleton className="h-4 w-full mb-3" />

        {/* Tags */}
        <div className="flex gap-1.5 mb-3">
          <Skeleton className="h-6 w-14" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex -space-x-2">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden min-w-[300px] lg:min-w-[350px]">
      {/* Banner */}
      <Skeleton className="aspect-[16/10] rounded-none" />

      {/* Content */}
      <div className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </div>
  );
}

export function ServerListItemSkeleton() {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <Skeleton className="w-10 h-10" />
      <Skeleton className="w-16 h-16 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-5 w-1/3 mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

export function TagCardSkeleton() {
  return (
    <div className="glass-card p-6">
      <Skeleton className="w-12 h-12 rounded-xl mb-4" />
      <Skeleton className="h-6 w-24 mb-2" />
      <Skeleton className="h-4 w-full mb-3" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-5 w-96" />
    </div>
  );
}
