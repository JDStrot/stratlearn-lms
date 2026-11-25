import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { type RetrainRules, type TrainingTiming } from "./status";

export type TrainingSettings = {
  default_due_days: number | null;
  grace_days: number;
  retrain_notice_days: number;
};

export const DEFAULT_TRAINING_SETTINGS: TrainingSettings = {
  default_due_days: 30,
  grace_days: 0,
  retrain_notice_days: 30,
};

export function readTrainingSettings(raw: unknown): TrainingSettings {
  const r = (raw ?? {}) as Partial<TrainingSettings>;
  const num = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 3650 ? Math.round(v) : d);
  return {
    default_due_days: r.default_due_days === null ? null : num(r.default_due_days, 30),
    grace_days: num(r.grace_days, 0),
    retrain_notice_days: num(r.retrain_notice_days, 30),
  };
}

export const timingOf = (t: TrainingSettings): TrainingTiming => ({
  graceDays: t.grace_days,
  noticeDays: t.retrain_notice_days,
});

/**
 * Everything that decides retraining for one team: course defaults, the
 * team's own course rules and its timing. Falls back to "no clocks" if the
 * retraining database update has not been run yet, so pages keep working.
 */
export async function loadRetrainRules(orgId: string): Promise<RetrainRules & { settings: TrainingSettings; timing: TrainingTiming }> {
  const db = supabaseAdmin();
  const [courses, team, org] = await Promise.all([
    db.from("courses").select("id, default_recurrence_months").not("default_recurrence_months", "is", null),
    db.from("org_course_settings").select("course_id, recurrence_months").eq("org_id", orgId),
    db.from("organizations").select("training_settings").eq("id", orgId).maybeSingle(),
  ]);
  const settings = org.error ? DEFAULT_TRAINING_SETTINGS : readTrainingSettings(org.data?.training_settings);
  return {
    courseDefault: new Map((courses.error ? [] : courses.data ?? []).map((c) => [c.id as string, c.default_recurrence_months as number | null])),
    teamRule: new Map((team.error ? [] : team.data ?? []).map((r) => [r.course_id as string, r.recurrence_months as number | null])),
    settings,
    timing: timingOf(settings),
  };
}
