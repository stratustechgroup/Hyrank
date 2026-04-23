import type { Server } from "@/lib/supabase/queries";

// Base URL for the site
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hyrank.gg";
export const SITE_NAME = "HyRank.gg";
export const SITE_DESCRIPTION = "The definitive Hytale server list. Discover, compare, and join the best Hytale servers.";

/**
 * Generate WebSite schema for the homepage
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/rankings?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate Organization schema
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      // Add social media URLs when available
    ],
  };
}

/**
 * Generate WebApplication schema for a server page
 */
export function generateServerSchema(server: Server) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: server.name,
    description: server.description,
    url: `${SITE_URL}/server/${server.id}`,
    applicationCategory: "Game Server",
    operatingSystem: "Cross-platform",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  // Add aggregate rating if available
  if (server.rating && server.rating.count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: server.rating.average.toFixed(1),
      ratingCount: server.rating.count,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate ItemList schema for server listings
 */
export function generateServerListSchema(
  servers: Server[],
  listName: string = "Top Hytale Servers"
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    itemListElement: servers.slice(0, 10).map((server, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: server.name,
      url: `${SITE_URL}/server/${server.id}`,
    })),
  };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate JSON-LD script tag content
 */
export function jsonLdScript(schema: Record<string, unknown>): string {
  return JSON.stringify(schema);
}

/** VideoGame schema for the Hytale game itself — inject on every page. */
export function generateHytaleVideoGameSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": "Hytale",
    "description":
      "Sandbox RPG developed by Hypixel Studios. Currently in Early Access on PC (Windows, macOS, Linux).",
    "url": "https://hytale.com",
    "playMode": "MultiPlayer",
    "applicationCategory": "Game",
    "operatingSystem": ["Windows", "macOS", "Linux"],
    "gamePlatform": ["PC"],
    "publisher": {
      "@type": "Organization",
      "name": "Hypixel Studios",
    },
  } as const;
}

/** Individual Review schema for a server review. */
export function generateReviewSchema(input: {
  serverName: string;
  serverUrl: string;
  rating: number; // 1-5
  content: string;
  authorName?: string;
  createdAt?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "WebApplication",
      "name": input.serverName,
      "url": input.serverUrl,
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": input.rating,
      "bestRating": 5,
      "worstRating": 1,
    },
    "reviewBody": input.content,
    ...(input.authorName && { "author": { "@type": "Person", "name": input.authorName } }),
    ...(input.createdAt && { "datePublished": input.createdAt }),
  } as const;
}

/** Product-style schema for a server listing — supports rich snippets with rating + offer. */
export function generateServerProductSchema(input: {
  name: string;
  description: string;
  image?: string;
  url: string;
  ratingMean?: number;
  ratingCount?: number;
  gamemode?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": input.name,
    "description": input.description,
    "url": input.url,
    "category": input.gamemode ?? "Hytale Server",
    "brand": { "@type": "Brand", "name": "HyRank.gg" },
  };
  if (input.image) schema.image = input.image;
  if (input.ratingMean && input.ratingCount && input.ratingCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": input.ratingMean,
      "reviewCount": input.ratingCount,
      "bestRating": 5,
      "worstRating": 1,
    };
  }
  return schema;
}
