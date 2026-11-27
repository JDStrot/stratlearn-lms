"use server";

import { revalidatePath } from "next/cache";
import { canManageTeam, inScope, logEvent, requireStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readTrainers, saveAnswer } from "@/lib/trainer";
import type { FormState } from "./actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Saves the team's safety trainer and HR trainer. */
export async function saveTrainers(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  if (!canManageTeam(s)) return { error: "Only owners and admins can change team settings." };
  const raw: Record<string, Record<string, string>> = {};
  for (const topic of ["safety", "hr"] as const) {
    const email = str(f, `${topic}.email`).toLowerCase();
    const name = str(f, `${topic}.name`);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: `${email} doesn't look like an email.` };
    if ((email || str(f, `${topic}.qualifications`)) && !name) return { error: `Add the ${topic === "hr" ? "HR" : "safety"} trainer's name.` };
    raw[topic] = {
      name,
      title: str(f, `${topic}.title`),
      qualifications: str(f, `${topic}.qualifications`),
      email,
      phone: str(f, `${topic}.phone`),
      hours: str(f, `${topic}.hours`),
    };
  }
  const value = readTrainers(raw);
  const { error } = await supabaseAdmin().from("organizations").update({ trainer_settings: value }).eq("id", s.org.id);
  if (error)
    return { error: /does not exist|schema cache/.test(error.message) ? "Trainers need the Ask a trainer database update first." : error.message };
  await logEvent(s, "settings.trainers", { safety: value.safety?.name ?? null, hr: value.hr?.name ?? null });
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

/** A manager or admin answers a question from the console. */
export async function answerQuestion(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  const answer = str(f, "answer").slice(0, 4000);
  if (!answer) return { error: "Write an answer first." };
  const db = supabaseAdmin();
  const { data: q } = await db
    .from("trainer_questions")
    .select("id, org_id, learner_id, course_id, question, lang, status, learners(location_id)")
    .eq("id", str(f, "id"))
    .eq("org_id", s.org.id)
    .maybeSingle();
  const loc = (Array.isArray(q?.learners) ? q?.learners[0] : q?.learners) as { location_id: string | null } | undefined;
  if (!q || !inScope(s, loc?.location_id ?? null)) return { error: "Question not found." };
  if (q.status === "answered") return { error: "Someone already answered this one." };
  const { data: me } = await db.from("staff_members").select("display_name").eq("org_id", s.org.id).eq("user_id", s.userId).maybeSingle();
  const out = await saveAnswer(q, answer, me?.display_name || s.email);
  if ("error" in out) return { error: out.error };
  await logEvent(s, "question.answer", { question_id: q.id });
  revalidatePath("/admin/questions");
  return { ok: "Sent. They'll see it in the course, and by email if they have one." };
}
