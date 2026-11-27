import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { sendEmail } from "./email";

/**
 * Ask a trainer.
 *
 * Some training rules say workers must be able to ask a real person about the
 * training and get an answer: California harassment e-learning (answer within
 * two business days), New York and Connecticut harassment, and OSHA topics such
 * as Bloodborne Pathogens (a knowledgeable person must answer questions).
 *
 * Each team names up to two trainers: a safety trainer and an HR trainer.
 * Courses below show an "Ask a trainer" button. Questions go to that topic's
 * trainer by email (with a link to answer without signing in) and into the
 * console's Questions inbox. The answer shows in the course and is emailed to
 * the worker when they have an email.
 */

export type Topic = "safety" | "hr";

export type Trainer = {
  name: string;
  title: string | null;
  qualifications: string | null;
  email: string | null;
  phone: string | null;
  hours: string | null;
};

export type TrainerSettings = { safety: Trainer | null; hr: Trainer | null };

/** Courses that need a trainer, and which trainer answers. */
export const TRAINER_COURSES: Record<string, Topic> = {
  "harassment-prevention-ca": "hr",
  "harassment-prevention-ca-supervisors": "hr",
  "harassment-prevention-ny": "hr",
  "harassment-prevention-nyc": "hr",
  "harassment-prevention-ct": "hr",
  "harassment-prevention-il": "hr",
  "harassment-prevention-il-restaurants": "hr",
  "bloodborne-pathogens": "safety",
  "workplace-violence-ca": "safety",
  "workplace-violence-ny-retail": "safety",
  "workplace-violence-healthcare": "safety",
  "hazard-communication": "safety",
  ppe: "safety",
  "lockout-tagout": "safety",
  "respiratory-protection": "safety",
  "hearing-conservation": "safety",
  "asbestos-awareness": "safety",
  "silica-lead": "safety",
};

export const topicOf = (slug: string): Topic | null => TRAINER_COURSES[slug] ?? null;

export const TOPIC_LABEL: Record<Topic, string> = { safety: "Safety trainer", hr: "HR trainer" };

const line = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isEmail = (v: string | null) => !!v && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

function readOne(raw: unknown): Trainer | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = line(r.name, 120);
  if (!name) return null;
  const email = line(r.email, 200)?.toLowerCase() ?? null;
  return {
    name,
    title: line(r.title, 120),
    qualifications: line(r.qualifications, 500),
    email: isEmail(email) ? email : null,
    phone: line(r.phone, 40),
    hours: line(r.hours, 120),
  };
}

export function readTrainers(raw: unknown): TrainerSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  return { safety: readOne(r.safety), hr: readOne(r.hr) };
}

/** Loaded on its own so teams without the database update keep working. */
export async function loadTrainers(orgId: string): Promise<TrainerSettings & { ready: boolean }> {
  const { data, error } = await supabaseAdmin().from("organizations").select("trainer_settings").eq("id", orgId).maybeSingle();
  if (error) return { safety: null, hr: null, ready: false };
  return { ...readTrainers(data?.trainer_settings), ready: true };
}

/**
 * Who answers a topic. If one trainer is missing, the other covers it, so a
 * team with only one trainer still gets every question.
 */
export function trainerFor(t: TrainerSettings, topic: Topic): Trainer | null {
  return t[topic] ?? t[topic === "hr" ? "safety" : "hr"] ?? null;
}

/** What's saved on a completion record: who the trainer was that day. */
export function trainerSnapshot(t: TrainerSettings, topic: Topic) {
  const tr = trainerFor(t, topic);
  return tr ? { topic, name: tr.name, title: tr.title, qualifications: tr.qualifications, email: tr.email } : null;
}

/** Adds business days (skips Saturday and Sunday; holidays not counted). */
export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

export const SITE = process.env.SITE_URL ?? "https://learn.stratlearn.co";

/** Saves an answer and emails it to the worker if they have an email. */
export async function saveAnswer(q: { id: string; org_id: string; learner_id: string; course_id: string | null; question: string; lang: string }, answer: string, by: string) {
  const db = supabaseAdmin();
  const { error } = await db
    .from("trainer_questions")
    .update({ answer, answered_at: new Date().toISOString(), answered_by: by.slice(0, 200), status: "answered", learner_seen_at: null })
    .eq("id", q.id);
  if (error) return { error: error.message };
  const [{ data: learner }, { data: course }] = await Promise.all([
    db.from("learners").select("display_name, email").eq("id", q.learner_id).maybeSingle(),
    q.course_id ? db.from("courses").select("title, title_es, slug").eq("id", q.course_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (learner?.email) {
    const es = q.lang === "es";
    const title = (es && course?.title_es) || course?.title || (es ? "tu capacitación" : "your training");
    const first = String(learner.display_name ?? "").split(" ")[0];
    const link = course?.slug ? `${SITE}/play/${course.slug}` : SITE;
    await sendEmail({
      to: [learner.email],
      subject: es ? `Respuesta a tu pregunta sobre ${title}` : `Answer to your question about ${title}`,
      text: es
        ? `Hola ${first},\n\nTu pregunta:\n${q.question}\n\nRespuesta de ${by}:\n${answer}\n\nTambién la ves en el curso: ${link}`
        : `Hi ${first},\n\nYou asked:\n${q.question}\n\n${by} answered:\n${answer}\n\nYou can also see it in the course: ${link}`,
    });
  }
  return { ok: true };
}
