"use server";

import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { readSession } from "@/lib/session";

export type ContactState = { error?: string; ok?: boolean };

const KINDS = ["feedback", "idea", "course_issue", "other"] as const;
const clip = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n);

/** Saves a Contact Us message for the owner portal. Email alerts come later (Resend). */
export async function sendFeedback(_prev: ContactState, f: FormData): Promise<ContactState> {
  const es = f.get("lang") === "es";
  // Hidden field that people never see; bots fill it in.
  if (clip(f.get("website"), 200)) return { ok: true };

  const kind = KINDS.find((k) => k === f.get("kind")) ?? "feedback";
  const message = clip(f.get("message"), 4000);
  if (message.length < 3) return { error: es ? "Escribe tu mensaje." : "Please write your message." };
  if (kind === "course_issue" && !f.get("courseId") && message.length < 10) {
    return { error: es ? "Dinos qué curso y qué pasó." : "Tell us which course and what happened." };
  }

  const courseId = clip(f.get("courseId"), 40);
  const session = await readSession();
  let staffUserId: string | null = null;
  if (!session && (await cookies()).getAll().some((c) => c.name.startsWith("sb-"))) {
    try {
      staffUserId = (await (await supabaseServer()).auth.getUser()).data.user?.id ?? null;
    } catch {}
  }

  const { error } = await supabaseAdmin()
    .from("feedback_messages")
    .insert({
      kind,
      course_id: /^[0-9a-f-]{36}$/i.test(courseId) ? courseId : null,
      message,
      name: clip(f.get("name"), 120) || null,
      contact: clip(f.get("contact"), 200) || null,
      learner_id: session?.lid ?? null,
      org_id: session?.oid ?? null,
      staff_user_id: staffUserId,
      page: clip((await headers()).get("referer"), 500) || null,
    });
  if (error) {
    console.error("feedback insert failed", error);
    return { error: es ? "No se pudo enviar. Inténtalo otra vez." : "We couldn't send that. Please try again." };
  }
  return { ok: true };
}
