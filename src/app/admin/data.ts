import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  learnerStatuses,
  type AssignmentRow,
  type CompletionRow,
  type CourseStatus,
} from "@/lib/status";

export type Person = {
  id: string;
  display_name: string;
  username: string;
  email: string | null;
  phone: string | null;
  employee_id: string | null;
  preferred_language: "en" | "es";
  job_role_id: string | null;
  location_id: string | null;
  is_active: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type Named = { id: string; name: string };
export type CourseLite = { id: string; slug: string; title: string; minutes: number | null };
export type PackLite = {
  id: string;
  slug: string;
  title: string;
  paths: { path: string; courseIds: string[] }[];
};

const PERSON_COLS =
  "id, display_name, username, email, phone, employee_id, preferred_language, job_role_id, location_id, is_active, locked_until, last_login_at, created_at";

/** Everything the console needs about one team, in one round of queries. */
export async function loadTeam(orgId: string) {
  const db = supabaseAdmin();
  const [people, roles, locations, assignments, completions, courses] = await Promise.all([
    db.from("learners").select(PERSON_COLS).eq("org_id", orgId).order("display_name"),
    db.from("job_roles").select("id, name").eq("org_id", orgId).order("name"),
    db.from("locations").select("id, name").eq("org_id", orgId).order("name"),
    db
      .from("assignments")
      .select("id, course_id, learner_id, job_role_id, location_id, due_at, recurrence_months, pack_id, pack_path, created_at")
      .eq("org_id", orgId),
    db
      .from("completions")
      .select("learner_id, course_id, completed_at, score")
      .eq("org_id", orgId)
      .order("completed_at", { ascending: false })
      .limit(50000),
    db.from("courses").select("id, slug, title, minutes").eq("is_published", true).order("title"),
  ]);
  return {
    people: (people.data ?? []) as Person[],
    roles: (roles.data ?? []) as Named[],
    locations: (locations.data ?? []) as Named[],
    assignments: (assignments.data ?? []) as (AssignmentRow & { pack_path: string | null })[],
    completions: (completions.data ?? []) as CompletionRow[],
    courses: (courses.data ?? []) as CourseLite[],
  };
}

export type Team = Awaited<ReturnType<typeof loadTeam>>;

/** Status rows for every active person: one per assigned course. */
export function teamStatus(team: Team) {
  const rows: { person: Person; statuses: CourseStatus[] }[] = [];
  for (const p of team.people) {
    if (!p.is_active) continue;
    rows.push({ person: p, statuses: learnerStatuses(p, team.assignments, team.completions) });
  }
  return rows;
}

/** Packs this team has switched on, with their role-path tabs. */
export async function loadPacks(orgId: string): Promise<PackLite[]> {
  const db = supabaseAdmin();
  const { data: on } = await db.from("org_packs").select("pack_id").eq("org_id", orgId);
  const ids = (on ?? []).map((r) => r.pack_id);
  if (!ids.length) return [];
  const [{ data: packs }, { data: links }] = await Promise.all([
    db.from("packs").select("id, slug, title").in("id", ids).order("title"),
    db.from("pack_courses").select("pack_id, course_id, path, position").in("pack_id", ids).order("position"),
  ]);
  return (packs ?? []).map((p) => {
    const byPath = new Map<string, string[]>();
    for (const l of links ?? []) {
      if (l.pack_id !== p.id) continue;
      const list = byPath.get(l.path) ?? [];
      list.push(l.course_id);
      byPath.set(l.path, list);
    }
    return { ...p, paths: [...byPath].map(([path, courseIds]) => ({ path, courseIds })) };
  });
}

export const nameOf = (list: Named[], id: string | null) =>
  (id && list.find((x) => x.id === id)?.name) || "";

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
