"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { startSession } from "@/lib/session";
import { readTablet } from "@/lib/tablet";

export type TabletState = { error?: string };

/** Tap your name, type your PIN. Uses the same PIN check and lockout as the main sign-in. */
export async function tabletLogin(_p: TabletState, f: FormData): Promise<TabletState> {
  const orgId = await readTablet();
  if (!orgId) redirect("/");
  const id = String(f.get("learnerId") ?? "");
  const pin = String(f.get("pin") ?? "");
  if (!/^[0-9]{4,8}$/.test(pin)) return { error: "Type your PIN." };
  const db = supabaseAdmin();
  const { data: person } = await db
    .from("learners")
    .select("username, organizations!inner(join_code)")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("is_active", true)
    .maybeSingle();
  if (!person) return { error: "Tap your name again." };
  const { data } = await db.rpc("verify_learner_pin", {
    p_join_code: (person.organizations as unknown as { join_code: string }).join_code,
    p_username: person.username,
    p_pin: pin,
  });
  const match = Array.isArray(data) ? data[0] : null;
  if (!match) return { error: "That PIN didn't match. After 5 tries it locks for 15 minutes." };
  await startSession(match.learner_id, match.org_id, false, true);
  redirect("/learn");
}
