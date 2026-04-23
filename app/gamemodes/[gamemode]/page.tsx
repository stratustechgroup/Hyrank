import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllGamemodes, getGamemodeBySlug, getServersByGamemodeSlug } from "@/lib/supabase/gamemodes";
import { generateGamemodeMetadata } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateServerListSchema,
  jsonLdScript,
} from "@/lib/seo/schemas";
import ServerCard from "@/components/ServerCard";

export const revalidate = 600; // ISR: refresh every 10 minutes (matches ranking cron)

interface Params {
  gamemode: string;
}

interface Props {
  params: Promise<Params>;
}

export async function generateStaticParams(): Promise<Params[]> {
  const gamemodes = await getAllGamemodes();
  return gamemodes.map((g) => ({ gamemode: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gamemode } = await params;
  const gm = await getGamemodeBySlug(gamemode);
  if (!gm) return { title: "Gamemode not found" };
  const servers = await getServersByGamemodeSlug(gm.slug, { limit: 50 });
  return generateGamemodeMetadata(gm.slug, gm.name, servers.length);
}

export default async function GamemodePage({ params }: Props) {
  const { gamemode } = await params;
  const gm = await getGamemodeBySlug(gamemode);
  if (!gm) notFound();

  const servers = await getServersByGamemodeSlug(gm.slug, { limit: 30 });

  const breadcrumb = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Gamemodes", url: "/gamemodes" },
    { name: gm.name, url: `/hytale-${gm.slug}-servers` },
  ]);
  const listSchema = generateServerListSchema(servers, `Top Hytale ${gm.name} Servers`);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(listSchema) }}
      />

      <main className="min-h-screen py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Hero / SEO copy */}
          <section className="space-y-4">
            <nav className="text-sm text-white/50">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-2">›</span>
              <Link href="/gamemodes" className="hover:text-white">Gamemodes</Link>
              <span className="mx-2">›</span>
              <span className="text-white">{gm.name}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold text-gradient">
              Best Hytale {gm.name} Servers
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-3xl">
              {servers.length > 0
                ? `Browse ${servers.length} ranked Hytale ${gm.name} servers. `
                : `No ${gm.name} servers listed yet — be the first. `}
              Live player counts, verified rankings, and real reviews — updated every 10 minutes.
              Vote for free and earn in-game rewards. Each server is scored by our Bayesian +
              retention + anti-fraud pipeline.
            </p>
            {gm.description && (
              <p className="text-white/60 text-base max-w-3xl">{gm.description}</p>
            )}
          </section>

          {/* Server grid */}
          {servers.length > 0 ? (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servers.map((s) => (
                <ServerCard key={s.id} server={s} />
              ))}
            </section>
          ) : (
            <section className="glass-card p-10 text-center">
              <p className="text-white/50">No servers listed in this gamemode yet.</p>
              <Link href="/submit" className="btn-primary mt-4 inline-block">
                Submit a server
              </Link>
            </section>
          )}

          {/* Long-tail SEO footer content */}
          <section className="glass-card p-8 space-y-4">
            <h2 className="text-xl font-semibold text-white">
              What makes a good Hytale {gm.name} server?
            </h2>
            <p className="text-white/70 leading-relaxed">
              A top {gm.name} server on HyRank combines active player counts, high uptime,
              verified ownership, and a low shadow-fraud rate. Rankings refresh every 10 minutes
              based on real activity — not raw vote counts, not featured slots paid under the
              table. Read our{" "}
              <Link href="/trust" className="text-blue-400 hover:underline">
                transparency report
              </Link>{" "}
              for the exact methodology.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
