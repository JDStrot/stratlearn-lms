/**
 * Training status: who has done what, what is due, and what is overdue.
 * Shared by the learner home and the manager console so both always agree.
 *
 * Retraining clocks: when an assignment repeats (recurrence_months, e.g. 12
 * for yearly harassment training), a completion only counts while it is
 * younger than that. After that the course is due again.
 */

export type AssignmentRow = {
  id: string;
  /** true = the manager picked a repeat for this assignment; false = follow the team or course rule. */
  recurrence_custom?: boolean | null;
  /** Finishes before this don't count for this assignment ("take it again"). */
  retake_after?: string | null;
  /** Group assignments: due N days after the later of the assignment and the person's start. */
  due_within_days?: number | null;
  course_id: string;
  learner_id: string | null;
  job_role_id: string | null;
  location_id: string | null;
  due_at: string | null;
  recurrence_months: number | null;
  pack_id?: string | null;
  created_at: string;
};

const DAY = 86_400_000;

export type LearnerTarget = {
  id: string;
  job_role_id: string | null;
  location_id: string | null;
  /** Start date (new hires); falls back to when they were added. */
  start_date?: string | null;
  created_at?: string | null;
};

/** The due date of one assignment for one person (new hires get their own window). */
export function dueFor(a: AssignmentRow, l: LearnerTarget): string | null {
  if (a.due_within_days == null) return a.due_at;
  const startRaw = l.start_date ? `${l.start_date}T12:00:00Z` : l.created_at;
  const t = (v: string | null | undefined) => (v ? new Date(v).getTime() || 0 : 0);
  const from = Math.max(t(a.created_at), t(a.retake_after), t(startRaw));
  const d = new Date(from + a.due_within_days * DAY);
  d.setUTCHours(23, 59, 0, 0);
  return d.toISOString();
}

export type CompletionRow = {
  learner_id: string;
  course_id: string;
  completed_at: string;
  score?: number | null;
  course_version?: number | null;
};

/**
 * done     finished and still valid
 * due      assigned, not finished yet, not late
 * overdue  assigned, not finished, past its due date (plus grace days)
 * renew    finished, but the retraining date is coming up soon
 * expired  finished, but the retraining date (plus grace days) has passed
 */
export type Status = "done" | "due" | "overdue" | "renew" | "expired";

/** Team-wide timing rules (organizations.training_settings). */
export type TrainingTiming = {
  /** Days after the due date before it counts as overdue. */
  graceDays: number;
  /** How many days before the retraining date the course comes back. */
  noticeDays: number;
};
export const DEFAULT_TIMING: TrainingTiming = { graceDays: 0, noticeDays: 30 };

export type CourseStatus = {
  courseId: string;
  status: Status;
  /** When it is (or was) due. For repeating training, the next retrain date once done. */
  dueAt: string | null;
  completedAt: string | null;
  score: number | null;
  /** Version of the course the last completion was on (any version counts). */
  completedVersion: number | null;
  recurrenceMonths: number | null;
  /** Set when a manager asked for a fresh retake. */
  retakeAfter: string | null;
  /** Latest finish on record, even one that no longer counts. */
  lastFinishedAt: string | null;
};

export function appliesTo(a: AssignmentRow, l: LearnerTarget): boolean {
  if (a.learner_id) return a.learner_id === l.id;
  if (a.job_role_id && a.job_role_id !== l.job_role_id) return false;
  if (a.location_id && a.location_id !== l.location_id) return false;
  return true;
}

export function addMonths(iso: string, months: number): Date {
  const d = new Date(iso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Feb 29 + 12 months: land on Feb 28, not Mar 1.
  if (d.getDate() !== day) d.setDate(0);
  return d;
}


/** Status of every course assigned to one learner. */
export function learnerStatuses(
  learner: LearnerTarget,
  assignments: AssignmentRow[],
  completions: CompletionRow[],
  now = new Date(),
  timing: TrainingTiming = DEFAULT_TIMING,
): CourseStatus[] {
  // Merge several assignments of the same course: earliest due date,
  // shortest retraining clock.
  const merged = new Map<string, { dueAt: string | null; recurrence: number | null; retakeAfter: string | null }>();
  for (const a of assignments) {
    if (!appliesTo(a, learner)) continue;
    const retake = a.retake_after ?? null;
    const due = dueFor(a, learner);
    const prev = merged.get(a.course_id);
    if (!prev) {
      merged.set(a.course_id, { dueAt: due, recurrence: a.recurrence_months, retakeAfter: retake });
      continue;
    }
    if (due && (!prev.dueAt || due < prev.dueAt)) prev.dueAt = due;
    if (a.recurrence_months && (!prev.recurrence || a.recurrence_months < prev.recurrence))
      prev.recurrence = a.recurrence_months;
    if (retake && (!prev.retakeAfter || retake > prev.retakeAfter)) prev.retakeAfter = retake;
  }

  const latest = new Map<string, CompletionRow>();
  for (const c of completions) {
    if (c.learner_id !== learner.id) continue;
    const prev = latest.get(c.course_id);
    if (!prev || prev.completed_at < c.completed_at) latest.set(c.course_id, c);
  }

  // The latest completion counts, whatever version of the course it was on:
  // a new version never wipes out someone's record or resets their clock.
  const grace = timing.graceDays * DAY;
  const out: CourseStatus[] = [];
  for (const [courseId, { dueAt, recurrence, retakeAfter }] of merged) {
    const last = latest.get(courseId);
    // "Take it again": an older finish stays on record but doesn't count here.
    const c = last && retakeAfter && new Date(last.completed_at) < new Date(retakeAfter) ? undefined : last;
    let status: Status;
    let due = dueAt;
    if (c) {
      if (recurrence) {
        const retrain = addMonths(c.completed_at, recurrence);
        due = retrain.toISOString();
        const t = now.getTime();
        if (t > retrain.getTime() + grace) status = "expired";
        else if (t >= retrain.getTime() - timing.noticeDays * DAY) status = "renew";
        else status = "done";
      } else {
        status = "done";
      }
    } else {
      status = dueAt && now.getTime() > new Date(dueAt).getTime() + grace ? "overdue" : "due";
    }
    out.push({
      courseId,
      status,
      dueAt: due,
      completedAt: c?.completed_at ?? null,
      score: c?.score ?? null,
      completedVersion: c?.course_version ?? null,
      recurrenceMonths: recurrence,
      retakeAfter,
      lastFinishedAt: last?.completed_at ?? null,
    });
  }
  return out;
}

export const STATUS_LABEL: Record<Status, string> = {
  done: "Done",
  due: "To do",
  overdue: "Overdue",
  renew: "Retrain soon",
  expired: "Retrain overdue",
};

/** Sort order for lists: most urgent first. */
export const STATUS_ORDER: Record<Status, number> = { overdue: 0, expired: 1, renew: 2, due: 3, done: 4 };

/** Still counts as trained for compliance (finished and not yet expired). */
export const isCurrent = (s: Status) => s === "done" || s === "renew";

/** Shows on the learner's to-do list. */
export const isToDo = (s: Status) => s !== "done";

export const isLate = (s: Status) => s === "overdue" || s === "expired";

/** Where a course's retraining clock comes from, most specific first. */
export type RetrainRules = {
  /** The course's own default (owner portal). Missing or null = never. */
  courseDefault: Map<string, number | null>;
  /** This team's rule for a course (manager settings). Present = wins over the course default. */
  teamRule: Map<string, number | null>;
};

/**
 * Resolves each assignment's real retraining clock:
 * the assignment's own repeat (if the manager picked one), else the team's
 * rule for that course, else the course default.
 */
export function applyRetrainRules<T extends AssignmentRow>(assignments: T[], rules: RetrainRules): T[] {
  return assignments.map((a) => {
    // undefined = database not updated yet: keep the old behavior.
    if (a.recurrence_custom !== false) return a;
    const months = rules.teamRule.has(a.course_id)
      ? rules.teamRule.get(a.course_id)!
      : (rules.courseDefault.get(a.course_id) ?? null);
    return { ...a, recurrence_months: months };
  });
}

export function repeatLabel(months: number | null | undefined) {
  if (!months) return "Never";
  if (months === 12) return "Every year";
  if (months % 12 === 0) return `Every ${months / 12} years`;
  if (months === 1) return "Every month";
  return `Every ${months} months`;
}
