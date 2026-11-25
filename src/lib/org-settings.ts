import "server-only";
import { supabaseAdmin } from "./supabase/admin";

/** Per-client settings stored as JSON on organizations (one column per area). */

export type NotifySettings = {
  /** Remind workers this many days before something is due (0 = off). */
  remind_before_days: number;
  /** Repeat reminders this often while it's due or late (0 = once). */
  remind_every_days: number;
  /** Tell managers once a course is this many days overdue (0 = off). */
  escalate_after_days: number;
  escalate_to: "managers" | "owners";
};

export type QuizSettings = {
  /** Score needed to pass, 0-100 (null = the course's own rule). */
  pass_score: number | null;
  /** Failed tries before a manager must give more (null = unlimited). */
  max_attempts: number | null;
};

export type CertificateSettings = {
  logo_path: string | null;
  signer_name: string | null;
  signer_title: string | null;
};

export type RecordsSettings = {
  /** Keep records at least this many years (null = forever). */
  retention_years: number | null;
  export_frequency: "off" | "weekly" | "monthly";
  export_emails: string[];
  last_export_at: string | null;
};

const int = (v: unknown, min: number, max: number, d: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : d;
const maybeInt = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null;
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);

export function readNotify(raw: unknown): NotifySettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    remind_before_days: int(r.remind_before_days, 0, 60, 7),
    remind_every_days: int(r.remind_every_days, 0, 60, 7),
    escalate_after_days: int(r.escalate_after_days, 0, 90, 7),
    escalate_to: r.escalate_to === "owners" ? "owners" : "managers",
  };
}

export function readQuiz(raw: unknown): QuizSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  return { pass_score: maybeInt(r.pass_score, 1, 100), max_attempts: maybeInt(r.max_attempts, 1, 20) };
}

export function readCertificate(raw: unknown): CertificateSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  return { logo_path: text(r.logo_path), signer_name: text(r.signer_name), signer_title: text(r.signer_title) };
}

export function readRecords(raw: unknown): RecordsSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const freq = r.export_frequency === "weekly" || r.export_frequency === "monthly" ? r.export_frequency : "off";
  const emails = Array.isArray(r.export_emails)
    ? r.export_emails.filter((e): e is string => typeof e === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).slice(0, 10)
    : [];
  return {
    retention_years: r.retention_years === null ? null : int(r.retention_years, 1, 50, 5),
    export_frequency: freq,
    export_emails: emails,
    last_export_at: typeof r.last_export_at === "string" ? r.last_export_at : null,
  };
}

/** All client settings for one team. */
export async function loadOrgSettings(orgId: string) {
  const { data } = await supabaseAdmin()
    .from("organizations")
    .select("notify_settings, quiz_settings, certificate_settings, records_settings")
    .eq("id", orgId)
    .maybeSingle();
  return {
    notify: readNotify(data?.notify_settings),
    quiz: readQuiz(data?.quiz_settings),
    certificate: readCertificate(data?.certificate_settings),
    records: readRecords(data?.records_settings),
  };
}
