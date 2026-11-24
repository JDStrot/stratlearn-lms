import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { learnerForAuthUser, supabaseAnonNoSession } from "@/lib/learner-auth";
import { startSession } from "@/lib/session";
import type { LoginSettings } from "@/lib/staff";

/**
 * Finishes an email-link, Google or Apple sign-in.
 *  - ?code=...        OAuth / same-device links (PKCE)
 *  - ?token_hash=...  email links opened on any device (Supabase email
 *                     template: {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email)
 * Managers go on to the console. Learners are matched to their team record,
 * get the normal learner session, and no Supabase session is kept.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const next = sp.get("next") ?? "/admin";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  const learnerFlow = safeNext.startsWith("/learn");
  const fail = (e: string) => NextResponse.redirect(new URL(learnerFlow ? `/?e=${e}` : `/admin/login?e=${e}`, req.url));

  const code = sp.get("code");
  const tokenHash = sp.get("token_hash");
  const type = (sp.get("type") ?? "email") as EmailOtpType;
  let user: User | null = null;

  if (learnerFlow && tokenHash) {
    const { data, error } = await supabaseAnonNoSession().auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) user = data.user;
  } else {
    const sb = await supabaseServer();
    const { data, error } = tokenHash
      ? await sb.auth.verifyOtp({ token_hash: tokenHash, type })
      : code
        ? await sb.auth.exchangeCodeForSession(code)
        : { data: { user: null }, error: true };
    if (!error) user = data.user;
    if (user && learnerFlow) await sb.auth.signOut({ scope: "local" });
  }
  if (!user) return fail("link");
  if (!learnerFlow) return NextResponse.redirect(new URL(safeNext, req.url));

  const match = await learnerForAuthUser(user);
  if (!match) return fail("nomatch");
  const method = (sp.get("m") ?? "email_link") as keyof LoginSettings;
  if (method in match.settings && !match.settings[method]) return fail("off");
  await startSession(match.learnerId, match.orgId, true);
  return NextResponse.redirect(new URL(safeNext, req.url));
}
