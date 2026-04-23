import { type NextRequest, NextResponse } from "next/server";

/**
 * Rewrites /hytale-{slug}-servers → /gamemodes/{slug}
 * The App Router does not support partial-dynamic folder names (hytale-[gamemode]-servers).
 * Middleware rewrites handle the SEO URL pattern while the internal route uses [gamemode].
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Match /hytale-{gamemode}-servers (alphanumeric + hyphens, single path segment)
  const match = pathname.match(/^\/hytale-([a-z0-9-]+)-servers\/?$/);
  if (match) {
    const slug = match[1];
    const url = request.nextUrl.clone();
    url.pathname = `/gamemodes/${slug}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on paths that start with /hytale-
  matcher: "/hytale-:path*",
};
