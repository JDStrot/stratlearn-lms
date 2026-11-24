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
  course_id: string;
  learner_id: string | null;
  job_role_id: string | null;
  location_id: string | null;
  due_at: string | null;
  recurrence_months: number | null;
  pack_id?: string | null;
  created_at: string;
};

export type LearnerTarget = {
  id: string;
  job_role_id: string | null;
  location_id: string | null;
};

export type CompletionRow = {
  learner_id: string;
  course_id: string;
  completed_at: string;
  score?: number | null;
};

export type Status = "done" | "due" | "overdue" | "expired";

export type CourseStatus = {
  courseId: string;
  status: Status;
  /** When it is (or was) due. For repeating training, the next retrain date once done. */
  dueAt: string | null;
  completedAt: string | null;
  score: number | null;
  recurrenceMonths: number | null;
};

export function appliesTo(a: AssignmentRow, l: LearnerTarget): boolean {
  if (a.learner_id) return a.learner_id === l.id;
  if (a.job_role_id && a.job_role_id !== l.job_role_id) return false;
  if (a.location_id && a.location_id !== l.location_id) return false;
  return true;
}

export function addMonths(iso: string, months: number): Date {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Status of every course assigned to one learner. */
export function learnerStatuses(
  learner: LearnerTarget,
  assignments: AssignmentRow[],
  completions: CompletionRow[],
  now = new Date(),
): CourseStatus[] {
  // Merge several assignments of the same course: earliest due date,
  // shortest retraining clock.
  const merged = new Map<string, { dueAt: string | null; recurrence: number | null }>();
  for (const a of assignments) {
    if (!appliesTo(a, learner)) continue;
    const prev = merged.get(a.course_id);
    if (!prev) {
      merged.set(a.course_id, { dueAt: a.due_at, recurrence: a.recurrence_months });
      continue;
    }
    if (a.due_at && (!prev.dueAt || a.due_at < prev.dueAt)) prev.dueAt = a.due_at;
    if (a.recurrence_months && (!prev.recurrence || a.recurrence_months < prev.recurrence))
      prev.recurrence = a.recurrence_months;
  }

  const latest = new Map<string, CompletionRow>();
  for (const c of completions) {
    if (c.learner_id !== learner.id) continue;
    const prev = latest.get(c.course_id);
    if (!prev || prev.completed_at < c.completed_at) latest.set(c.course_id, c);
  }

  const out: CourseStatus[] = [];
  for (const [courseId, { dueAt, recurrence }] of merged) {
    const c = latest.get(courseId);
    let status: Status;
    let due = dueAt;
    if (c) {
      if (recurrence) {
        const retrain = addMonths(c.completed_at, recurrence);
        due = retrain.toISOString();
        status = retrain > now ? "done" : "expired";
      } else {
        status = "done";
      }
    } else {
      status = dueAt && new Date(dueAt) < now ? "overdue" : "due";
    }
    out.push({
      courseId,
      status,
      dueAt: due,
      completedAt: c?.completed_at ?? null,
      score: c?.score ?? null,
      recurrenceMonths: recurrence,
    });
  }
  return out;
}

export const STATUS_LABEL: Record<Status, string> = {
  done: "Done",
  due: "To do",
  overdue: "Overdue",
  expired: "Retrain due",
};

export const isLate = (s: Status) => s === "overdue" || s === "expired";
