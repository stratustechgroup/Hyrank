// Constants for server tags
export const SERVER_TAGS = [
  "SMP",
  "RPG",
  "Minigames",
  "Factions",
  "Creative",
  "PvP",
  "Economy",
  "Survival",
  "Adventure",
  "Hardcore",
] as const;

export type ServerTag = (typeof SERVER_TAGS)[number];

// Convenience array for filtering
export const ALL_TAGS: string[] = [...SERVER_TAGS];

export interface TagCategory {
  name: ServerTag;
  slug: string;
  description: string;
  serverCount: number;
}

export const TAG_CATEGORIES: TagCategory[] = [
  { name: "SMP", slug: "smp", description: "Survival multiplayer servers with community focus", serverCount: 0 },
  { name: "RPG", slug: "rpg", description: "Role-playing servers with quests and progression", serverCount: 0 },
  { name: "Minigames", slug: "minigames", description: "Fun mini-games and competitive modes", serverCount: 0 },
  { name: "Factions", slug: "factions", description: "Team-based territory and raiding gameplay", serverCount: 0 },
  { name: "Creative", slug: "creative", description: "Building and creative mode servers", serverCount: 0 },
  { name: "PvP", slug: "pvp", description: "Player vs player combat focused servers", serverCount: 0 },
  { name: "Economy", slug: "economy", description: "Servers with trading and economic systems", serverCount: 0 },
  { name: "Survival", slug: "survival", description: "Classic survival gameplay experience", serverCount: 0 },
  { name: "Adventure", slug: "adventure", description: "Adventure maps and exploration servers", serverCount: 0 },
  { name: "Hardcore", slug: "hardcore", description: "Challenging hardcore mode servers", serverCount: 0 },
];

export const NAV_LINKS = [
  { label: "Browse Servers", href: "/", icon: "grid" },
  { label: "Rankings", href: "/rankings", icon: "trophy" },
  { label: "Tags", href: "/tags", icon: "tag" },
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "About", href: "/about", icon: "info" },
] as const;
