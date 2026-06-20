import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { sharedCookieOptions } from "./cookies";

const AUTH_PREFIXES = ["/login"];

/** Routes reachable WITHOUT a signed-in admin. `/velkommen` is the public
 * connect-card a newcomer fills in, `/skjerm` is the foyer welcome screen (runs
 * on a TV that can never log in), `/api/connect` is the unauthenticated submit
 * endpoint, and `/auth/callback` lands the magic-link exchange before any
 * session cookie exists. */
const PUBLIC_PREFIXES = ["/velkommen", "/skjerm", "/api/connect", "/auth/callback"];

/** Refresh the session cookie and gate admin routes behind auth. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: sharedCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isAuthRoute = AUTH_PREFIXES.some((p) => path.startsWith(p));
  const isPublicRoute = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  if (isPublicRoute) return response;

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
