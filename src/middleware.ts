import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps manager (Supabase Auth) sign-ins fresh on console pages.
 * Learner pages use their own cookie and skip this.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res; // e.g. a preview deploy without keys: pages show their own error
  const sb = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  try {
    await sb.auth.getUser();
  } catch (e) {
    console.error("middleware auth refresh", e);
  }
  return res;
}

export const config = { matcher: ["/admin/:path*", "/auth/:path*"] };
