import type { Metadata } from "next";
import type { Server } from "@/lib/supabase/queries";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "./schemas";

/**
 * Default metadata for the site
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - The Definitive Hytale Server List`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Hytale",
    "Hytale servers",
    "Hytale server list",
    "Hytale multiplayer",
    "Hytale communities",
    "game servers",
    "server finder",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - The Definitive Hytale Server List`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - The Definitive Hytale Server List`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

/**
 * Generate metadata for homepage
 */
export function generateHomeMetadata(): Metadata {
  return {
    ...defaultMetadata,
    alternates: {
      canonical: SITE_URL,
    },
  };
}

/**
 * Generate metadata for a server page
 */
export function generateServerMetadata(server: Server): Metadata {
  const title = `${server.name} - Hytale Server`;
  const description = `Join ${server.players.online.toLocaleString()} players on ${server.name}. ${server.tags.slice(0, 3).join(", ")} Hytale server.${server.rating && server.rating.count > 0 ? ` ${server.rating.average.toFixed(1)} rating.` : ""}${server.uptime?.month ? ` ${server.uptime.month}% uptime.` : ""}`;

  return {
    title,
    description,
    keywords: [
      server.name,
      "Hytale server",
      ...server.tags,
      "multiplayer",
      "gaming",
    ],
    openGraph: {
      type: "website",
      url: `${SITE_URL}/server/${server.id}`,
      title,
      description,
      siteName: SITE_NAME,
      images: [
        {
          url: server.banner,
          width: 1200,
          height: 630,
          alt: server.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [server.banner],
    },
    alternates: {
      canonical: `${SITE_URL}/server/${server.id}`,
    },
  };
}

/**
 * Generate metadata for a category/tag page
 */
export function generateCategoryMetadata(
  categoryName: string,
  serverCount: number,
  slug: string
): Metadata {
  const title = `Best ${categoryName} Hytale Servers`;
  const description = `Discover ${serverCount} ${categoryName} Hytale servers. Browse, compare, and find your perfect ${categoryName.toLowerCase()} server.`;

  return {
    title,
    description,
    keywords: [
      categoryName,
      `${categoryName} Hytale servers`,
      "Hytale server list",
      "multiplayer",
    ],
    openGraph: {
      type: "website",
      url: `${SITE_URL}/tags/${slug}`,
      title,
      description,
      siteName: SITE_NAME,
    },
    alternates: {
      canonical: `${SITE_URL}/tags/${slug}`,
    },
  };
}

/**
 * Generate metadata for rankings page
 */
export function generateRankingsMetadata(): Metadata {
  const title = "Server Rankings";
  const description = "Browse the top-ranked Hytale servers. Compare player counts, uptime, and ratings to find the best servers.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: `${SITE_URL}/rankings`,
      title: `${title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
    },
    alternates: {
      canonical: `${SITE_URL}/rankings`,
    },
  };
}

/**
 * Generate metadata for about page
 */
export function generateAboutMetadata(): Metadata {
  const title = "About HyRank";
  const description = "Learn about HyRank.gg, the definitive Hytale server list. Our mission, features, and how we help players find great servers.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: `${SITE_URL}/about`,
      title: `${title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
    },
    alternates: {
      canonical: `${SITE_URL}/about`,
    },
  };
}
