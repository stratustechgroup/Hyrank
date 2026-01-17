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
