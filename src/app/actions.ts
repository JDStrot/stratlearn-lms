"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { endSession, startSession } from "@/lib/session";

export type LoginState = { error?: string };

export async function loginWithPin(_prev: LoginState, form: FormData): Promise<LoginState> {
  const joinCode = String(form.get("joinCode") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const pin = String(form.get("pin") ?? "").trim();

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

  await startSession(match.learner_id, match.org_id);
  redirect("/learn");
}

export async function logout() {
  await endSession();
  redirect("/");
}
