import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SESSION_COOKIE, encodeSession, sessionCookieOptions } from "@/lib/session";

/**
 * QR badge login. A learner's QR code points to /q/<qr_token>.
 * Scanning it signs them in and opens their courses.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const home = new URL("/", req.url);
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.redirect(home);

  const db = supabaseAdmin();
  const { data: learner } = await db
    .from("learners")
    .select("id, org_id, organizations(login_settings)")
    .eq("qr_token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (!learner) return NextResponse.redirect(home);
  const settings = (learner.organizations as unknown as { login_settings: { qr?: boolean } } | null)?.login_settings;
  if (settings?.qr === false) return NextResponse.redirect(new URL("/?e=off", req.url));

  await db.from("learners").update({ last_login_at: new Date().toISOString() }).eq("id", learner.id);

  const res = NextResponse.redirect(new URL("/learn", req.url));
  res.cookies.set(SESSION_COOKIE, encodeSession(learner.id, learner.org_id), sessionCookieOptions);
  return res;
}
