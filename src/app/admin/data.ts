import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { teamTz } from "@/lib/team-time";
import { loadRetrainRules } from "@/lib/retrain";
import {
  applyRetrainRules,
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
  start_date: string | null;
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
  "id, display_name, username, email, phone, employee_id, preferred_language, job_role_id, location_id, is_active, locked_until, last_login_at, created_at, start_date";

/** Everything the console needs about one team, in one round of queries. */
export async function loadTeam(orgId: string, locationIds: string[] | null = null) {
  const db = supabaseAdmin();
  const [people, roles, locations, assignments, completions, courses, rules] = await Promise.all([
    db.from("learners").select(PERSON_COLS).eq("org_id", orgId).order("display_name"),
    db.from("job_roles").select("id, name").eq("org_id", orgId).order("name"),
    db.from("locations").select("id, name").eq("org_id", orgId).order("name"),
    db
      .from("assignments")
      // "*" so this keeps working before and after the retraining database update.
      .select("*")
      .eq("org_id", orgId),
    db
      .from("completions")
      .select("learner_id, course_id, completed_at, score, course_version")
      .eq("org_id", orgId)
      .order("completed_at", { ascending: false })
      .limit(50000),
    db.from("courses").select("id, slug, title, minutes").eq("is_published", true).order("title"),
    loadRetrainRules(orgId),
  ]);
  type A = AssignmentRow & { pack_path: string | null };
  // Managers limited to some locations only see those people and places.
  const scoped = <T,>(list: T[], loc: (x: T) => string | null) =>
    locationIds ? list.filter((x) => { const l = loc(x); return !!l && locationIds.includes(l); }) : list;
  const peopleList = scoped((people.data ?? []) as Person[], (p) => p.location_id);
  const visible = new Set(peopleList.map((p) => p.id));
  const raw = (assignments.data ?? []) as A[];
  return {
    people: peopleList,
    roles: (roles.data ?? []) as Named[],
    locations: scoped((locations.data ?? []) as Named[], (l) => l.id),
    /** As the managers set them (repeat = only what they picked). */
    rawAssignments: raw,
    /** With the real retraining clock filled in from team and course rules. */
    assignments: applyRetrainRules(raw, rules),
    rules,
    completions: ((completions.data ?? []) as CompletionRow[]).filter((c) => !locationIds || visible.has(c.learner_id)),
    courses: (courses.data ?? []) as CourseLite[],
  };
}

export type Team = Awaited<ReturnType<typeof loadTeam>>;

/** Status rows for every active person: one per assigned course. */
export function teamStatus(team: Team) {
  const rows: { person: Person; statuses: CourseStatus[] }[] = [];
  for (const p of team.people) {
    if (!p.is_active) continue;
    rows.push({ person: p, statuses: learnerStatuses(p, team.assignments, team.completions, new Date(), team.rules.timing) });
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

/** "Nov 24, 2026" in the team's time zone (see lib/team-time.ts). */
export function fmtDate(iso: string | null | undefined, tz = teamTz()) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz });
}
