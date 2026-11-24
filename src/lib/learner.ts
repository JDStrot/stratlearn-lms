import "server-only";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "./supabase/admin";
import { readSession } from "./session";
import { learnerStatuses, type AssignmentRow, type CompletionRow } from "./status";

export type Learner = {
  id: string;
  org_id: string;
  display_name: string;
  preferred_language: "en" | "es";
  job_role_id: string | null;
  location_id: string | null;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  title_es: string | null;
  minutes: number | null;
  storage_path: string | null;
  version: number;
};

/** The signed-in learner, or a redirect to the login page. */
export async function requireLearner(): Promise<Learner> {
  const session = await readSession();
  if (!session) redirect("/");
  const { data } = await supabaseAdmin()
    .from("learners")
    .select("id, org_id, display_name, preferred_language, job_role_id, location_id")
    .eq("id", session.lid)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) redirect("/");
  return data as Learner;
}

/**
 * Courses assigned to this learner: directly, through their job role or
 * location, or to the whole organization. Repeating training (retraining
 * clocks) shows up as "to do" again once the last completion runs out.
 */
export async function assignedCourses(learner: Learner) {
  const targets = [
    `learner_id.eq.${learner.id}`,
    "and(learner_id.is.null,job_role_id.is.null,location_id.is.null)",
  ];
  if (learner.job_role_id) targets.push(`job_role_id.eq.${learner.job_role_id}`);
  if (learner.location_id) targets.push(`location_id.eq.${learner.location_id}`);

  const db = supabaseAdmin();
  const [{ data: rows }, { data: done }] = await Promise.all([
    db
      .from("assignments")
      .select(
        "id, course_id, learner_id, job_role_id, location_id, due_at, recurrence_months, created_at, courses!inner(id, slug, title, title_es, minutes, storage_path, version, is_published)",
      )
      .eq("org_id", learner.org_id)
      .eq("courses.is_published", true)
      .or(targets.join(",")),
    db.from("completions").select("learner_id, course_id, completed_at").eq("learner_id", learner.id),
  ]);

  const courses = new Map<string, Course>();
  for (const row of rows ?? []) {
    const course = row.courses as unknown as Course;
    courses.set(course.id, course);
  }
  const statuses = learnerStatuses(learner, (rows ?? []) as AssignmentRow[], (done ?? []) as CompletionRow[]);
  return statuses.map((st) => ({
    course: courses.get(st.courseId)!,
    dueAt: st.dueAt,
    completedAt: st.status === "done" ? st.completedAt : null,
  }));
}
