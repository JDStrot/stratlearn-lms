import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assignedCourses, type Learner } from "@/lib/learner";
import { randomToken } from "@/lib/staff";
import { sendEmail } from "@/lib/email";
import { SITE, TOPIC_LABEL, loadTrainers, topicOf, trainerFor } from "@/lib/trainer";

/**
 * Ask a trainer, from inside a course.
 *   GET  /api/questions?slug=<slug>[&seen=1]  the trainer for this course and the worker's questions and answers
 *   POST /api/questions {slug, question, lang}  sends a question to the trainer
 */

async function learnerAndCourse(slug: string | null | undefined) {
  const session = await readSession();
  if (!session || !slug) return null;
  const db = supabaseAdmin();
  const { data: learner } = await db
    .from("learners")
    .select("id, org_id, display_name, preferred_language, job_role_id, location_id, start_date, created_at, email")
    .eq("id", session.lid)
    .eq("is_active", true)
    .maybeSingle();
  if (!learner) return null;
  const item = (await assignedCourses(learner as Learner)).find((i) => i.course.slug === slug);
  const topic = topicOf(slug);
  if (!item || !topic) return null;
  return { learner, course: item.course, topic };
}

export async function GET(req: NextRequest) {
  const ctx = await learnerAndCourse(req.nextUrl.searchParams.get("slug"));
  if (!ctx) return NextResponse.json({ error: "not found" }, { status: 404 });
  const trainers = await loadTrainers(ctx.learner.org_id);
  const t = trainerFor(trainers, ctx.topic);
  const db = supabaseAdmin();
  const { data: qs } = await db
    .from("trainer_questions")
    .select("id, created_at, question, answer, answered_at, answered_by, learner_seen_at")
    .eq("learner_id", ctx.learner.id)
    .eq("course_id", ctx.course.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const unseen = (qs ?? []).filter((q) => q.answer && !q.learner_seen_at).map((q) => q.id);
  // Opening the box (seen=1) marks new answers as read.
  if (unseen.length && req.nextUrl.searchParams.get("seen") === "1") await db.from("trainer_questions").update({ learner_seen_at: new Date().toISOString() }).in("id", unseen);
  return NextResponse.json({
    ready: trainers.ready,
    trainer: t && { name: t.name, title: t.title, qualifications: t.qualifications, phone: t.phone, hours: t.hours, canEmail: !!t.email },
    questions: (qs ?? []).map((q) => ({ id: q.id, at: q.created_at, question: q.question, answer: q.answer, answeredAt: q.answered_at, by: q.answered_by, isNew: unseen.includes(q.id) })),
    newAnswers: unseen.length,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { slug?: string; question?: string; lang?: string } | null;
  const ctx = await learnerAndCourse(body?.slug);
  if (!ctx) return NextResponse.json({ error: "not found" }, { status: 404 });
  const question = String(body?.question ?? "").trim().slice(0, 2000);
  if (question.length < 3) return NextResponse.json({ error: "empty" }, { status: 400 });
  const lang = body?.lang === "es" ? "es" : "en";
  const db = supabaseAdmin();

  // Keep it to a sane number per day.
  const { count } = await db
    .from("trainer_questions")
    .select("id", { count: "exact", head: true })
    .eq("learner_id", ctx.learner.id)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 10) return NextResponse.json({ error: "too_many" }, { status: 429 });

  const trainers = await loadTrainers(ctx.learner.org_id);
  if (!trainers.ready) return NextResponse.json({ error: "not_set_up" }, { status: 503 });
  const t = trainerFor(trainers, ctx.topic);
  const token = randomToken(16);
  const { data: q, error } = await db
    .from("trainer_questions")
    .insert({
      org_id: ctx.learner.org_id,
      learner_id: ctx.learner.id,
      course_id: ctx.course.id,
      topic: ctx.topic,
      question,
      lang,
      token,
      sent_to: t ? { name: t.name, email: t.email } : null,
    })
    .select("id")
    .single();
  if (error || !q) {
    console.error("question insert failed", error);
    return NextResponse.json({ error: "could not save" }, { status: 500 });
  }

  let emailed = false;
  if (t?.email) {
    const { data: org } = await db.from("organizations").select("name").eq("id", ctx.learner.org_id).maybeSingle();
    const status = await sendEmail({
      to: [t.email],
      subject: `Training question from ${ctx.learner.display_name}: ${ctx.course.title}`,
      text:
        `${ctx.learner.display_name} at ${org?.name ?? "your team"} asked a question in ${ctx.course.title}` +
        `${lang === "es" ? " (in Spanish)" : ""}:\n\n${question}\n\n` +
        `Answer here (no sign-in needed): ${SITE}/answer/${token}\n\n` +
        `Please answer within two business days. You're getting this because you're listed as the ${TOPIC_LABEL[ctx.topic].toLowerCase()} for ${org?.name ?? "this team"}.`,
    });
    emailed = status === "sent";
  }
  return NextResponse.json({ ok: true, hasTrainer: !!t, emailed });
}
