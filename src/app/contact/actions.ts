"use server";

import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { readSession } from "@/lib/session";
import { MAX_LINKS, checkStamp, countLinks } from "@/lib/spam";

export type ContactState = { error?: string; ok?: boolean };

const KINDS = ["feedback", "idea", "course_issue", "other"] as const;
const clip = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n);

/** Saves a Contact Us message for the owner portal. Email alerts come later (Resend). */
export async function sendFeedback(_prev: ContactState, f: FormData): Promise<ContactState> {
  const es = f.get("lang") === "es";
  // Hidden field that people never see; bots fill it in.
  if (clip(f.get("website"), 200)) return { ok: true };
  const stamp = checkStamp(f.get("stamp"));
  if (stamp === "bot") return { ok: true };
  if (stamp === "stale") {
    return { error: es ? "Esta página estuvo abierta mucho tiempo. Recárgala y envía otra vez." : "This page was open a long time. Please reload it and send again." };
  }

  const kind = KINDS.find((k) => k === f.get("kind")) ?? "feedback";
  const message = clip(f.get("message"), 4000);
  if (message.length < 3) return { error: es ? "Escribe tu mensaje." : "Please write your message." };
  if (kind === "course_issue" && !f.get("courseId") && message.length < 10) {
    return { error: es ? "Dinos qué curso y qué pasó." : "Tell us which course and what happened." };
  }

  if (countLinks(message) > MAX_LINKS) {
    return { error: es ? "Quita algunos enlaces e inténtalo otra vez." : "Please take out some of the links and try again." };
  }

  const courseId = clip(f.get("courseId"), 40);
  const session = await readSession();
  let staffUserId: string | null = null;
  if (!session && (await cookies()).getAll().some((c) => c.name.startsWith("sb-"))) {
    try {
      staffUserId = (await (await supabaseServer()).auth.getUser()).data.user?.id ?? null;
    } catch {}
  }

  // Rate limits: 5 an hour for a signed-in person; 30 an hour for everyone who isn't signed in, together.
  const db = supabaseAdmin();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  let recent = db.from("feedback_messages").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
  recent = session ? recent.eq("learner_id", session.lid) : staffUserId ? recent.eq("staff_user_id", staffUserId) : recent.is("learner_id", null).is("staff_user_id", null);
  const { count } = await recent;
  if ((count ?? 0) >= (session || staffUserId ? 5 : 30)) {
    return { error: es ? "Recibimos muchos mensajes ahora. Inténtalo otra vez en una hora." : "We're getting a lot of messages right now. Please try again in an hour." };
  }

  const { error } = await db
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
