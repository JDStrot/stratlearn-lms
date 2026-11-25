import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assignedCourses, type Learner } from "@/lib/learner";

/**
 * Small updates from the course player while a course is open:
 *  - { slug, seconds }        active time since the last update (capped)
 *  - { slug, failed, score }  a final check that was not passed
 * Both are best-effort: if the database hasn't had the time-and-tries
 * update yet, this quietly does nothing.
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { slug?: string; seconds?: number; failed?: boolean; score?: number; lang?: string }
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
  const courseId = item.course.id;

  if (body.failed) {
    // The course's own final check was not passed: a failed try. Counts toward
    // the team's try limit, like a score under the team's passing bar does.
    const score = typeof body.score === "number" && body.score >= 0 && body.score <= 100 ? Math.round(body.score) : null;
    const { error } = await db.from("course_attempts").insert({
      org_id: learner.org_id,
      learner_id: learner.id,
      course_id: courseId,
      course_version: item.course.version,
      kind: "attempt",
      score,
    });
    if (error) console.warn("failed try not saved", error.message);
  }

  // Never trust more than 2 minutes per update; the player sends every 30 seconds.
  const add = Math.max(0, Math.min(120, Math.round(Number(body.seconds) || 0)));
  if (add) {
    const { data: row, error } = await db
      .from("course_progress")
      .select("seconds_spent")
      .eq("learner_id", learner.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (error) {
      console.warn("time not saved", error.message);
    } else if (row) {
      await db
        .from("course_progress")
        .update({ seconds_spent: (row.seconds_spent ?? 0) + add })
        .eq("learner_id", learner.id)
        .eq("course_id", courseId);
    } else {
      await db.from("course_progress").insert({ learner_id: learner.id, course_id: courseId, seconds_spent: add });
    }
  }
  return NextResponse.json({ ok: true });
}
