import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase/admin";
import { DEFAULT_LOGIN_SETTINGS, normalizePhone, type LoginSettings } from "./staff";

/**
 * The extra ways in (email, Google, Apple, text code) use Supabase Auth to
 * prove who someone is. Then we find their learner record and start the
 * normal learner session, so the rest of the app works the same.
 */

export type AuthMatch = { learnerId: string; orgId: string; settings: LoginSettings };

type AuthUser = { id: string; email?: string | null; phone?: string | null };

/** A Supabase client that keeps nothing in cookies (password sign-in check only). */
export function supabaseAnonNoSession() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Finds the learner for a signed-in Supabase user: first by the linked
 * account, then by the email or mobile number their manager put on file.
 * Links the account on first use. Picks the most recently used team if the
 * person works for more than one.
 */
export async function learnerForAuthUser(user: AuthUser): Promise<AuthMatch | null> {
  const db = supabaseAdmin();
  const cols = "id, org_id, auth_user_id, last_login_at, organizations(login_settings)";
  type Row = { id: string; org_id: string; auth_user_id: string | null; last_login_at: string | null; organizations: { login_settings: Partial<LoginSettings> } | null };

  let { data } = await db.from("learners").select(cols).eq("auth_user_id", user.id).eq("is_active", true);
  let rows = (data ?? []) as unknown as Row[];
  if (!rows.length && user.email) {
    ({ data } = await db.from("learners").select(cols).ilike("email", user.email).eq("is_active", true).is("auth_user_id", null));
    rows = (data ?? []) as unknown as Row[];
  }
  if (!rows.length && user.phone) {
    const phone = normalizePhone(user.phone);
    if (phone) {
      ({ data } = await db.from("learners").select(cols).eq("phone", phone).eq("is_active", true).is("auth_user_id", null));
      rows = (data ?? []) as unknown as Row[];
    }
  }
  if (!rows.length) return null;
  rows.sort((a, b) => (b.last_login_at ?? "").localeCompare(a.last_login_at ?? ""));
  const pick = rows[0];
  if (!pick.auth_user_id) {
    await db.from("learners").update({ auth_user_id: user.id }).eq("id", pick.id);
  }
  await db.from("learners").update({ last_login_at: new Date().toISOString() }).eq("id", pick.id);
  return {
    learnerId: pick.id,
    orgId: pick.org_id,
    settings: { ...DEFAULT_LOGIN_SETTINGS, ...(pick.organizations?.login_settings ?? {}) },
  };
}

/** Sign-in options switched on for this deployment (providers need dashboard setup first). */
export function providerFlags() {
  return {
    google: process.env.AUTH_GOOGLE === "on",
    apple: process.env.AUTH_APPLE === "on",
    sms: process.env.AUTH_SMS === "on",
  };
}
