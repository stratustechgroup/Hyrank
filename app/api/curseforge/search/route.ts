import { NextResponse } from "next/server";

const HYTALE_GAME_ID = 932; // verify via `GET /v1/games` at integration time

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ mods: [] });

  const apiKey = process.env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { mods: [], error: "CURSEFORGE_API_KEY not configured" },
      { status: 200 }, // graceful fallback — UI shows manual entry
    );
  }

  const res = await fetch(
    `https://api.curseforge.com/v1/mods/search?gameId=${HYTALE_GAME_ID}` +
      `&searchFilter=${encodeURIComponent(q)}&pageSize=15&sortField=2&sortOrder=desc`,
    {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) return NextResponse.json({ mods: [], error: "upstream" }, { status: 200 });
  const { data } = (await res.json()) as {
    data: Array<{
      id: number;
      name: string;
      slug: string;
      downloadCount?: number;
      logo?: { thumbnailUrl?: string };
      links?: { websiteUrl?: string };
    }>;
  };
  return NextResponse.json({
    mods: data.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      downloads: m.downloadCount ?? 0,
      logo: m.logo?.thumbnailUrl ?? null,
      url: m.links?.websiteUrl ?? null,
    })),
  });
}
