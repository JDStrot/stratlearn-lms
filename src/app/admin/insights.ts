import "server-only";
import { isLate, learnerStatuses, type Status } from "@/lib/status";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nameOf, teamStatus, type Person, type Team } from "./data";

/**
 * Numbers behind the Dashboards pages. Everything is worked out from the same
 * status rules as the Overview and Reports pages, so the charts always agree
 * with the tables and the CSV.
 */

/** The five buckets shown on charts. "renew" = done, but the retrain date is close. */
export type Bucket = "done" | "renew" | "due" | "overdue" | "expired";
export const bucketOf = (s: Status | string): Bucket => {
  if (s === "done" || s === "renew") return s;
  if (s === "expired") return "expired";
  if (isLate(s as Status)) return "overdue";
  return "due";
};
const isCurrent = (b: Bucket) => b === "done" || b === "renew";

export type Range = "3m" | "6m" | "12m";
export const RANGES: Record<Range, string> = { "3m": "Last 3 months", "6m": "Last 6 months", "12m": "Last 12 months" };
export const toRange = (v: string | undefined): Range => (v === "3m" || v === "6m" || v === "12m" ? v : "6m");

export type Filter = { role?: string; location?: string; range?: string };

type Period = { start: Date; end: Date; label: string; long: string };

/** Weekly buckets for 3 months, monthly otherwise. Oldest first. */
export function periods(range: Range, now = new Date()): Period[] {
  const out: Period[] = [];
  if (range === "3m") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    for (let i = 12; i >= 0; i--) {
      const e = new Date(end.getTime() - i * 7 * 864e5);
      const s = new Date(e.getTime() - 7 * 864e5 + 1);
      const short = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      out.push({ start: s, end: e, label: short, long: `Week of ${short}` });
    }
    return out;
  }
  const n = range === "6m" ? 6 : 12;
  for (let i = n - 1; i >= 0; i--) {
    const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    e.setMilliseconds(-1);
    out.push({
      start: s,
      end: i === 0 ? now : e,
      label: s.toLocaleDateString("en-US", { month: "short" }),
      long: s.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

type Count = Record<Bucket, number>;
const zero = (): Count => ({ done: 0, renew: 0, due: 0, overdue: 0, expired: 0 });

export type Group = { id: string; name: string; people: number; counts: Count; assigned: number; current: number; late: number };

/** In-progress course counts (started but not finished) per learner. */
export async function loadProgress(learnerIds: string[]) {
  if (!learnerIds.length) return [] as ProgressRow[];
  const db = supabaseAdmin();
  const out: ProgressRow[] = [];
  for (let i = 0; i < learnerIds.length; i += 500) {
    const { data } = await db
      .from("course_progress")
      .select("learner_id, course_id, percent, updated_at")
      .in("learner_id", learnerIds.slice(i, i + 500))
      .limit(50000);
    out.push(...(data ?? []));
  }
  return out;
}

/** Completions with the extra columns the dashboards use (language). */
async function loadLanguages(orgId: string) {
  const { data } = await supabaseAdmin()
    .from("completions")
    .select("learner_id, course_id, completed_at, language")
    .eq("org_id", orgId)
    .limit(50000);
  return (data ?? []) as LangRow[];
}

export async function teamInsights(team: Team, orgId: string, f: Filter, now = new Date()) {
  const ids = teamStatus(team).map((r) => r.person.id);
  const [progress, langs] = await Promise.all([loadProgress(ids), loadLanguages(orgId)]);
  return computeInsights(team, f, progress, langs, now);
}

type ProgressRow = { learner_id: string; course_id: string; percent: number; updated_at: string };
type LangRow = { learner_id: string; course_id: string; completed_at: string; language: string | null };

/** Pure part: no database calls, so it can be tested with sample data. */
export function computeInsights(team: Team, f: Filter, allProgress: ProgressRow[], langs: LangRow[], now = new Date()) {
  const range = toRange(f.range);
  const keep = (p: Person) =>
    (!f.role || p.job_role_id === f.role) && (!f.location || p.location_id === f.location);

  const rows = teamStatus(team).filter((r) => keep(r.person));
  const ids = new Set(rows.map((r) => r.person.id));
  const progress = allProgress.filter((p) => ids.has(p.learner_id));
  const completions = team.completions.filter((c) => ids.has(c.learner_id));
  const courseTitle = new Map(team.courses.map((c) => [c.id, c.title]));

  // Status mix right now.
  const mix = zero();
  for (const r of rows) for (const st of r.statuses) mix[bucketOf(st.status)]++;
  const assigned = Object.values(mix).reduce((a, b) => a + b, 0);
  const current = mix.done + mix.renew;
  const late = mix.overdue + mix.expired;

  // Groups: by role and by location.
  const group = (key: (p: Person) => string | null, list: { id: string; name: string }[], none: string) => {
    const m = new Map<string, Group>();
    for (const r of rows) {
      const id = key(r.person) ?? "";
      const g =
        m.get(id) ??
        { id, name: id ? nameOf(list, id) : none, people: 0, counts: zero(), assigned: 0, current: 0, late: 0 };
      g.people++;
      for (const st of r.statuses) {
        const b = bucketOf(st.status);
        g.counts[b]++;
        g.assigned++;
        if (isCurrent(b)) g.current++;
        if (b === "overdue" || b === "expired") g.late++;
      }
      m.set(id, g);
    }
    return [...m.values()].sort((a, b) => b.late - a.late || a.name.localeCompare(b.name));
  };
  const byRole = group((p) => p.job_role_id, team.roles, "No role");
  const byLocation = group((p) => p.location_id, team.locations, "No location");

  // Finished per period, and % done over time (replays the status rules at each period end).
  const ps = periods(range, now);
  const finished = ps.map((p) => ({
    ...p,
    value: completions.filter((c) => {
      const t = new Date(c.completed_at).getTime();
      return t >= p.start.getTime() && t <= p.end.getTime();
    }).length,
  }));
  const trend = ps.map((p) => {
    const at = p.end;
    const iso = at.toISOString();
    const as = team.assignments.filter((a) => a.created_at <= iso);
    const cs = completions.filter((c) => c.completed_at <= iso);
    let tot = 0;
    let ok = 0;
    for (const r of rows) {
      if (r.person.created_at > iso) continue;
      for (const st of learnerStatuses(r.person, as, cs, at, team.rules.timing)) {
        tot++;
        if (isCurrent(bucketOf(st.status))) ok++;
      }
    }
    return { ...p, value: tot ? Math.round((ok / tot) * 100) : null, total: tot, ok };
  });

  // Upcoming retraining dates, next 6 months.
  const months = Array.from({ length: 6 }, (_, i) => {
    const s = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    return { start: s, end: e, label: s.toLocaleDateString("en-US", { month: "short" }), long: s.toLocaleDateString("en-US", { month: "long", year: "numeric" }), value: 0 };
  });
  const upcoming: { personId: string; name: string; course: string; dueAt: string }[] = [];
  for (const r of rows)
    for (const st of r.statuses) {
      const b = bucketOf(st.status);
      if (!isCurrent(b) || !st.recurrenceMonths || !st.dueAt) continue;
      const t = new Date(st.dueAt);
      const m = months.find((x) => t >= x.start && t < x.end);
      if (!m) continue;
      m.value++;
      upcoming.push({ personId: r.person.id, name: r.person.display_name, course: courseTitle.get(st.courseId) ?? "", dueAt: st.dueAt });
    }
  upcoming.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const repeating = rows.reduce((n, r) => n + r.statuses.filter((s) => s.recurrenceMonths).length, 0);

  // Courses: assigned, done, average score, finishes in range.
  const since = ps[0].start.getTime();
  const courseAgg = new Map<string, { id: string; title: string; assigned: number; current: number; late: number; scores: number[]; finishes: number }>();
  const ca = (id: string) => {
    const v = courseAgg.get(id) ?? { id, title: courseTitle.get(id) ?? "Course", assigned: 0, current: 0, late: 0, scores: [], finishes: 0 };
    courseAgg.set(id, v);
    return v;
  };
  for (const r of rows)
    for (const st of r.statuses) {
      const v = ca(st.courseId);
      const b = bucketOf(st.status);
      v.assigned++;
      if (isCurrent(b)) v.current++;
      if (b === "overdue" || b === "expired") v.late++;
    }
  for (const c of completions) {
    if (new Date(c.completed_at).getTime() < since) continue;
    const v = ca(c.course_id);
    v.finishes++;
    if (c.score != null) v.scores.push(c.score);
  }
  const courses = [...courseAgg.values()]
    .map((c) => ({ ...c, avgScore: c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) : null }))
    .sort((a, b) => b.finishes - a.finishes || b.assigned - a.assigned || a.title.localeCompare(b.title));

  const allScores = completions.filter((c) => new Date(c.completed_at).getTime() >= since && c.score != null).map((c) => c.score as number);
  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

  // Compliance grid: course × location, % current.
  const gridCourses = [...courseAgg.values()].filter((c) => c.assigned).sort((a, b) => b.assigned - a.assigned).slice(0, 12);
  const gridCols = byLocation.map((g) => ({ id: g.id, name: g.name }));
  const grid = gridCourses.map((c) => ({
    course: c.title,
    cells: gridCols.map((col) => {
      let tot = 0;
      let ok = 0;
      for (const r of rows) {
        if ((r.person.location_id ?? "") !== col.id) continue;
        const st = r.statuses.find((s) => s.courseId === c.id);
        if (!st) continue;
        tot++;
        if (isCurrent(bucketOf(st.status))) ok++;
      }
      return tot ? { pct: Math.round((ok / tot) * 100), ok, tot } : null;
    }),
  }));

  // Language of finished courses, in range.
  const langCount = { en: 0, es: 0 };
  for (const c of langs) {
    if (!ids.has(c.learner_id) || new Date(c.completed_at).getTime() < since) continue;
    if (c.language === "es") langCount.es++;
    else langCount.en++;
  }

  // People: signed in, active lately, courses in progress.
  const monthAgo = now.getTime() - 30 * 864e5;
  const people = rows.length;
  const everIn = rows.filter((r) => r.person.last_login_at).length;
  const recentIn = rows.filter((r) => r.person.last_login_at && new Date(r.person.last_login_at).getTime() > monthAgo).length;
  const finishedMonth = completions.filter((c) => new Date(c.completed_at).getTime() > monthAgo).length;
  const inProgress = progress.filter((p) => p.percent > 0 && p.percent < 100).length;
  const allClear = rows.filter((r) => r.statuses.length && r.statuses.every((s) => isCurrent(bucketOf(s.status)))).length;

  return {
    range,
    mix,
    assigned,
    current,
    late,
    pct: assigned ? Math.round((current / assigned) * 100) : 0,
    byRole,
    byLocation,
    finished,
    trend,
    months,
    upcoming,
    repeating,
    courses,
    avgScore,
    grid: { cols: gridCols, rows: grid },
    langCount,
    people: { total: people, everIn, recentIn, allClear },
    finishedMonth,
    inProgress,
  };
}

export type TeamInsights = ReturnType<typeof computeInsights>;
