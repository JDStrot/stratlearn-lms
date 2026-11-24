"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { endSession, readSession, startSession } from "@/lib/session";
import { learnerForAuthUser, providerFlags, supabaseAnonNoSession } from "@/lib/learner-auth";
import { DEFAULT_LOGIN_SETTINGS, normalizePhone, type LoginSettings } from "@/lib/staff";
import { siteOrigin } from "@/lib/origin";

export type LoginState = { error?: string; ok?: string; step?: "code" };

const OFF = "Your team doesn't use this way to sign in. Try your PIN or QR badge.";
const NO_MATCH = "We couldn't find you on a team. Ask your manager to add your email, or use your PIN.";

export async function loginWithPin(_prev: LoginState, form: FormData): Promise<LoginState> {
  const joinCode = String(form.get("joinCode") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();
  const remember = form.get("remember") === "on";

  if (!joinCode || !username || !/^[0-9]{4,8}$/.test(pin)) {
    return { error: "Enter your team code, your name and your PIN." };
  }

  const { data, error } = await supabaseAdmin().rpc("verify_learner_pin", {
    p_join_code: joinCode,
    p_username: username,
    p_pin: pin,
  });
  if (error) {
    console.error("verify_learner_pin failed", error);
    return { error: "Something went wrong. Please try again." };
  }
  const match = Array.isArray(data) ? data[0] : null;
  if (!match) {
    return {
      error: "That didn't match. Check your details, or ask your manager to reset your PIN.",
    };
  }

  if (!(await teamAllows(match.org_id, "pin"))) return { error: OFF };
  await startSession(match.learner_id, match.org_id, remember);
  redirect("/learn");
}

async function teamAllows(orgId: string, method: keyof LoginSettings) {
  const { data } = await supabaseAdmin().from("organizations").select("login_settings").eq("id", orgId).maybeSingle();
  return { ...DEFAULT_LOGIN_SETTINGS, ...(data?.login_settings ?? {}) }[method];
}

/** Email + password (for people who'd rather not use a PIN). */
export async function loginWithEmail(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  if (!email || !password) return { error: "Enter your email and password." };

  const { data, error } = await supabaseAnonNoSession().auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "That email and password didn't match. No password yet? Tap “Email me a link”." };
  const match = await learnerForAuthUser(data.user);
  if (!match) return { error: NO_MATCH };
  if (!match.settings.email_password) return { error: OFF };
  await startSession(match.learnerId, match.orgId, remember);
  redirect("/learn");
}

/** Emails a one-tap sign-in link to an address a manager (or the learner) put on file. */
export async function sendLoginLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter your email." };
  const sent = { ok: "Check your email for a sign-in link. Open it on this phone or computer." };

  const { data: onFile } = await supabaseAdmin()
    .from("learners")
    .select("id")
    .ilike("email", email)
    .eq("is_active", true)
    .limit(1);
  if (!onFile?.length) return sent; // Same answer either way: never reveal who is on a team.

  const { error } = await supabaseAnonNoSession().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/learn&m=email_link` },
  });
  if (error) {
    console.error("learner email link", error.message);
    return { error: "We couldn't send the email just now. Try again in a minute, or use your PIN." };
  }
  return sent;
}

/** Google or Apple: hands off to the provider, then back to /auth/callback. */
export async function loginWithProvider(form: FormData) {
  const provider = form.get("provider") === "apple" ? "apple" : "google";
  if (!providerFlags()[provider]) redirect("/");
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=/learn&m=${provider}` },
  });
  if (error || !data.url) redirect("/?e=provider");
  redirect(data.url);
}

/** Text-message codes. Built, but off unless AUTH_SMS=on and the team allows it. */
export async function sendTextCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!providerFlags().sms) return { error: OFF };
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "Enter your mobile number." };
  const { data: onFile } = await supabaseAdmin().from("learners").select("id").eq("phone", phone).eq("is_active", true).limit(1);
  if (onFile?.length) {
    const { error } = await supabaseAnonNoSession().auth.signInWithOtp({ phone: `+${phone}` });
    if (error) console.error("sms code", error.message);
  }
  return { step: "code", ok: "If that number is on a team, a code is on its way." };
}

export async function verifyTextCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!providerFlags().sms) return { error: OFF };
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const token = String(form.get("code") ?? "").trim();
  if (!phone || !/^[0-9]{6}$/.test(token)) return { step: "code", error: "Enter the 6-digit code." };
  const { data, error } = await supabaseAnonNoSession().auth.verifyOtp({ phone: `+${phone}`, token, type: "sms" });
  if (error || !data.user) return { step: "code", error: "That code didn't work. Check it, or send a new one." };
  const match = await learnerForAuthUser(data.user);
  if (!match) return { error: NO_MATCH };
  if (!match.settings.sms) return { error: OFF };
  await startSession(match.learnerId, match.orgId, true);
  redirect("/learn");
}

export async function logout() {
  const session = await readSession();
  await endSession();
  // Shared tablets go back to the name list, ready for the next person.
  if (session?.kiosk && (await cookies()).get("sl_tablet")) redirect("/tablet");
  redirect("/");
}
