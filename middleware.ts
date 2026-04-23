import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- 1. hytale-[slug]-servers rewrite (existing Plan 4 logic) ----
  // Match /hytale-{gamemode}-servers (alphanumeric + hyphens, single path segment)
  const slugMatch = pathname.match(/^\/hytale-([a-z0-9-]+)-servers\/?$/);
  if (slugMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/gamemodes/${slugMatch[1]}`;
    return NextResponse.rewrite(url);
  }

  // ---- 2. Supabase session refresh on every request ----
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- 3. Auth gate /dashboard and /submit ----
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/submit")) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude static assets, public-access endpoints, and cron routes.
    // Cron routes use their own Bearer CRON_SECRET auth and don't need
    // Supabase session refresh — processing cookies on every Vercel Cron
    // invocation is pure overhead.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/waitlist|api/public|api/cron).*)",
  ],
};
