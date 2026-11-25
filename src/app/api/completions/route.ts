import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assignedCourses } from "@/lib/learner";
import { addMonths } from "@/lib/status";
import type { Learner } from "@/lib/learner";

/**
 * Records a course completion, issues a certificate and awards the course badge.
 * Called by the course player when a course posts "stratlearn:complete".
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { slug?: string; score?: number; lang?: string }
    | null;
  if (!body?.slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: learner } = await db
    .from("learners")
    .select("id, org_id, display_name, preferred_language, job_role_id, location_id")
    .eq("id", session.lid)
    .eq("is_active", true)
    .maybeSingle();
  if (!learner) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const item = (await assignedCourses(learner as Learner)).find((i) => i.course.slug === body.slug);
  if (!item) return NextResponse.json({ error: "course not assigned" }, { status: 404 });
  const { course } = item;

  const score =
    typeof body.score === "number" && body.score >= 0 && body.score <= 100
      ? Math.round(body.score)
      : null;
  const language = body.lang === "es" ? "es" : "en";

  const { data: completion, error } = await db
    .from("completions")
    .insert({
      org_id: learner.org_id,
      learner_id: learner.id,
      course_id: course.id,
      course_version: course.version,
      language,
      score,
    })
    .select("id, completed_at")
    .single();
  if (error || !completion) {
    console.error("completion insert failed", error);
    return NextResponse.json({ error: "could not save" }, { status: 500 });
  }

  const { data: cert } = await db
    .from("certificates")
    .insert({
      completion_id: completion.id,
      org_id: learner.org_id,
      learner_id: learner.id,
      course_id: course.id,
      // Printed as "valid until" when this course has a retraining clock.
      expires_at: item.recurrenceMonths ? addMonths(completion.completed_at, item.recurrenceMonths).toISOString() : null,
    })
    .select("verify_code")
    .single();

  const { data: badge } = await db.from("badges").select("id").eq("course_id", course.id).maybeSingle();
  if (badge) {
    await db
      .from("learner_badges")
      .upsert({ learner_id: learner.id, badge_id: badge.id }, { ignoreDuplicates: true });
  }

  await db
    .from("course_progress")
    .upsert({ learner_id: learner.id, course_id: course.id, percent: 100, updated_at: new Date().toISOString() });

  await recordTimeAndTries(db, {
    orgId: learner.org_id,
    learnerId: learner.id,
    courseId: course.id,
    completionId: completion.id,
    score,
    language,
    roundStart: [item.lastFinishedAt, item.retakeAfter].filter(Boolean).sort().pop() ?? null,
  });

  return NextResponse.json({ ok: true, certificate: cert?.verify_code ?? null });
}

/**
 * Moves the time spent in this round onto the completion, counts the final
 * check tries it took, and logs the passing try. Best-effort: does nothing
 * until the time-and-tries database update has been run.
 */
async function recordTimeAndTries(
  db: ReturnType<typeof supabaseAdmin>,
  o: { orgId: string; learnerId: string; courseId: string; completionId: string; score: number | null; language: string; roundStart: string | null },
) {
  const { data: prog, error } = await db
    .from("course_progress")
    .select("seconds_spent")
    .eq("learner_id", o.learnerId)
    .eq("course_id", o.courseId)
    .maybeSingle();
  if (error) return; // columns not there yet
  let fails = db
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("learner_id", o.learnerId)
    .eq("course_id", o.courseId)
    .eq("passed", false);
  if (o.roundStart) fails = fails.gt("attempted_at", o.roundStart);
  const { count } = await fails;
  await Promise.all([
    db
      .from("completions")
      .update({ seconds_spent: prog?.seconds_spent || null, attempts: (count ?? 0) + 1 })
      .eq("id", o.completionId),
    db.from("quiz_attempts").insert({
      org_id: o.orgId,
      learner_id: o.learnerId,
      course_id: o.courseId,
      score: o.score,
      passed: true,
      language: o.language,
    }),
    db.from("course_progress").update({ seconds_spent: 0 }).eq("learner_id", o.learnerId).eq("course_id", o.courseId),
  ]);
}
