import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assignedCourses } from "@/lib/learner";
import { addMonths } from "@/lib/status";
import { attemptState, roundStartOf } from "@/lib/attempts";
import { loadOrgSettings } from "@/lib/org-settings";
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
    .select("id, org_id, display_name, preferred_language, job_role_id, location_id, start_date, created_at")
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

  // Team passing score and tries. A score under the bar is a failed try, not a finish.
  const { quiz } = await loadOrgSettings(learner.org_id);
  if (quiz.pass_score != null || quiz.max_attempts != null) {
    const start = roundStartOf(item.lastFinishedAt, item.retakeAfter, item.completedAt);
    const before = await attemptState(learner.id, course.id, start, quiz);
    if (before.locked) return NextResponse.json({ ok: false, locked: true, need: quiz.pass_score });
    if (quiz.pass_score != null && score != null && score < quiz.pass_score) {
      await db.from("course_attempts").insert({
        org_id: learner.org_id,
        learner_id: learner.id,
        course_id: course.id,
        course_version: course.version,
        kind: "attempt",
        score,
      });
      const triesLeft = before.triesLeft == null ? null : before.triesLeft - 1;
      return NextResponse.json({ ok: false, score, need: quiz.pass_score, triesLeft, locked: triesLeft === 0 });
    }
  }

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

  return NextResponse.json({ ok: true, certificate: cert?.verify_code ?? null });
}
