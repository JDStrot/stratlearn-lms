"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveAnswer } from "@/lib/trainer";

/** The trainer answers from the link in their email (the link's secret is the sign-in). */
export async function answerByToken(_p: { error?: string; ok?: string }, f: FormData) {
  const token = String(f.get("token") ?? "").replace(/[^a-f0-9]/g, "");
  const answer = String(f.get("answer") ?? "").trim().slice(0, 4000);
  const by = String(f.get("by") ?? "").trim().slice(0, 120);
  if (!answer) return { error: "Write an answer first." };
  if (!by) return { error: "Add your name so they know who answered." };
  const { data: q } = await supabaseAdmin()
    .from("trainer_questions")
    .select("id, org_id, learner_id, course_id, question, lang, status")
    .eq("token", token)
    .maybeSingle();
  if (!q) return { error: "This link doesn't work anymore." };
  if (q.status === "answered") return { error: "Someone already answered this one." };
  const out = await saveAnswer(q, answer, by);
  if ("error" in out) return { error: out.error };
  return { ok: "Sent. They'll see it in the course, and by email if they have one. Thank you!" };
}
