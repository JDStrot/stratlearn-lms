"use server";

import { revalidatePath } from "next/cache";
import { requireLearner } from "@/lib/learner";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AccountState = { error?: string; ok?: string };

/**
 * Lets a learner add (or change) an email + password, so they can sign in
 * without their PIN. Creates or updates their Supabase Auth account.
 */
export async function saveEmailPassword(_p: AccountState, f: FormData): Promise<AccountState> {
  const session = await readSession();
  if (!session || session.kiosk) return { error: "Sign in on your own phone to do this." };
  const learner = await requireLearner();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const password = String(f.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Type your email." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };

  const db = supabaseAdmin();
  const { data: me } = await db.from("learners").select("auth_user_id").eq("id", learner.id).single();
  const { data: clash } = await db
    .from("learners")
    .select("id")
    .eq("org_id", learner.org_id)
    .ilike("email", email)
    .neq("id", learner.id)
    .limit(1);
  if (clash?.length) return { error: "Someone on your team already uses that email." };

  let authId = me?.auth_user_id as string | null;
  if (authId) {
    const { error } = await db.auth.admin.updateUserById(authId, { email, password, email_confirm: true });
    if (error) return { error: error.message.includes("already") ? "That email already has an account. Use “Email me a link” on the sign-in page to connect it." : "Couldn't save that. Try again." };
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) {
      // The email has an account already (maybe at another job). Put it on file so
      // "Email me a link" connects it once they prove they own the inbox.
      await db.from("learners").update({ email }).eq("id", learner.id);
      return { error: "That email already has an account. On the sign-in page, use “Email me a link” once to connect it." };
    }
    authId = data.user.id;
  }
  await db.from("learners").update({ email, auth_user_id: authId }).eq("id", learner.id);
  revalidatePath("/learn/account");
  return { ok: "Saved. You can now sign in with your email and password." };
}

export async function removePasskey(f: FormData) {
  const learner = await requireLearner();
  await supabaseAdmin().from("learner_passkeys").delete().eq("id", String(f.get("id"))).eq("learner_id", learner.id);
  revalidatePath("/learn/account");
}

export async function setLanguage(f: FormData) {
  const learner = await requireLearner();
  const lang = f.get("lang") === "es" ? "es" : "en";
  await supabaseAdmin().from("learners").update({ preferred_language: lang }).eq("id", learner.id);
  revalidatePath("/learn", "layout");
}
