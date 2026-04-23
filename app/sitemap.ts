import { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllGamemodes } from "@/lib/supabase/gamemodes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hyrank.gg";

// Static pages
const staticPages = [
  "",
  "/rankings",
  "/tags",
  "/about",
  "/trust",
  "/login",
  "/register",
];

// Tag/category pages
const tagPages = [
  "/tags/smp",
  "/tags/pvp",
  "/tags/rpg",
  "/tags/minigames",
  "/tags/economy",
  "/tags/creative",
  "/tags/survival",
  "/tags/adventure",
];

interface SitemapServer {
  id: string;
  featured: boolean;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${SITE_URL}${page}`,
    lastModified: now,
    changeFrequency: page === "" ? "daily" : "weekly",
    priority: page === "" ? 1 : page === "/rankings" ? 0.9 : 0.7,
  }));

  // Tag pages
  const tagEntries: MetadataRoute.Sitemap = tagPages.map((page) => ({
    url: `${SITE_URL}${page}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Fetch servers from Supabase for server pages
  let serverEntries: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("servers")
        .select("id, featured")
        .order("vote_count", { ascending: false });

      const servers = data as SitemapServer[] | null;

      if (servers) {
        serverEntries = servers.map((server) => ({
          url: `${SITE_URL}/server/${server.id}`,
          lastModified: now,
          changeFrequency: "daily" as const,
          priority: server.featured ? 0.9 : 0.6,
        }));
      }
    }
  } catch (error) {
    console.error("Error fetching servers for sitemap:", error);
  }

  // Gamemode landing pages
  let gamemodeEntries: MetadataRoute.Sitemap = [];
  try {
    const gamemodes = await getAllGamemodes();
    gamemodeEntries = gamemodes.map((g) => ({
      url: `${SITE_URL}/hytale-${g.slug}-servers`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error("Error fetching gamemodes for sitemap:", error);
  }

  return [...staticEntries, ...tagEntries, ...gamemodeEntries, ...serverEntries];
}
