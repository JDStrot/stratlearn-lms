"use server";

import { revalidatePath } from "next/cache";
import { canManageTeam, inScope, logEvent, randomToken, requireStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readCertificate, readRecords } from "@/lib/org-settings";
import { DEFAULT_TZ, validTz } from "@/lib/time-zones";
import type { FormState } from "./actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string, min: number, max: number) => {
  const v = str(f, k);
  if (v === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
};

async function requireTeamAdmin() {
  const s = await requireStaff();
  if (!canManageTeam(s)) throw new Error("Only owners and admins can change team settings.");
  return s;
}

async function saveJson(column: string, value: Record<string, unknown>): Promise<FormState> {
  const s = await requireTeamAdmin();
  const { error } = await supabaseAdmin().from("organizations").update({ [column]: value }).eq("id", s.org.id);
  if (error)
    return {
      error: /does not exist|schema cache/.test(error.message) ? "These settings need the client-settings database update first." : error.message,
    };
  await logEvent(s, `settings.${column.replace("_settings", "")}`, value);
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

// ---------------------------------------------------------------------------
// Reminders and escalation
// ---------------------------------------------------------------------------

export async function saveNotify(_p: FormState, f: FormData): Promise<FormState> {
  const before = num(f, "remindBefore", 0, 60);
  const every = num(f, "remindEvery", 0, 60);
  const escalate = num(f, "escalateAfter", 0, 90);
  if ([before, every, escalate].some((v) => Number.isNaN(v))) return { error: "Use whole numbers of days." };
  return saveJson("notify_settings", {
    remind_before_days: before ?? 0,
    remind_every_days: every ?? 0,
    escalate_after_days: escalate ?? 0,
    escalate_to: str(f, "escalateTo") === "owners" ? "owners" : "managers",
  });
}

// ---------------------------------------------------------------------------
// Passing score and tries
// ---------------------------------------------------------------------------

export async function saveQuiz(_p: FormState, f: FormData): Promise<FormState> {
  const pass = num(f, "passScore", 1, 100);
  const tries = num(f, "maxAttempts", 1, 20);
  if (Number.isNaN(pass)) return { error: "Passing score is 1 to 100, or leave it empty." };
  if (Number.isNaN(tries)) return { error: "Tries is 1 to 20, or leave it empty for unlimited." };
  return saveJson("quiz_settings", { pass_score: pass, max_attempts: tries });
}

/** Gives a worker more tries on a course they're locked out of. */
export async function resetAttempts(f: FormData) {
  const s = await requireStaff();
  const learnerId = str(f, "learnerId");
  const courseId = str(f, "courseId");
  const db = supabaseAdmin();
  const { data: p } = await db.from("learners").select("id, location_id").eq("id", learnerId).eq("org_id", s.org.id).maybeSingle();
  if (!p || !inScope(s, p.location_id)) return;
  await db.from("course_attempts").insert({ org_id: s.org.id, learner_id: learnerId, course_id: courseId, kind: "reset", created_by: s.userId });
  await logEvent(s, "person.more_tries", { learner_id: learnerId, course_id: courseId });
  revalidatePath(`/admin/people/${learnerId}`);
}

// ---------------------------------------------------------------------------
// Certificate branding
// ---------------------------------------------------------------------------

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function saveCertificate(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireTeamAdmin();
  const db = supabaseAdmin();
  const { data: org } = await db.from("organizations").select("certificate_settings").eq("id", s.org.id).maybeSingle();
  const current = readCertificate(org?.certificate_settings);
  let logo_path = str(f, "removeLogo") === "on" ? null : current.logo_path;

  const file = f.get("logo");
  if (file instanceof File && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return { error: "Logo must be a PNG, JPG or WebP image." };
    if (file.size > 1_000_000) return { error: "Logo must be under 1 MB." };
    logo_path = `${s.org.id}/branding/logo-${randomToken(4)}.${ext}`;
    const up = await db.storage.from("org-files").upload(logo_path, file, { contentType: file.type, upsert: true });
    if (up.error) return { error: up.error.message };
  }
  return saveJson("certificate_settings", {
    logo_path,
    signer_name: str(f, "signerName").slice(0, 80) || null,
    signer_title: str(f, "signerTitle").slice(0, 80) || null,
  });
}

// ---------------------------------------------------------------------------
// Records: retention and scheduled report emails
// ---------------------------------------------------------------------------

export async function saveRecords(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireTeamAdmin();
  const { data: org } = await supabaseAdmin().from("organizations").select("records_settings").eq("id", s.org.id).maybeSingle();
  const current = readRecords(org?.records_settings);
  const years = str(f, "retention") === "forever" ? null : num(f, "retention", 1, 50);
  if (Number.isNaN(years)) return { error: "Pick how long to keep records." };
  const emails = str(f, "emails")
    .split(/[\s,;]+/)
    .map((e) => e.toLowerCase())
    .filter(Boolean);
  const bad = emails.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if (bad) return { error: `${bad} doesn't look like an email.` };
  const freq = ["weekly", "monthly"].includes(str(f, "frequency")) ? str(f, "frequency") : "off";
  if (freq !== "off" && !emails.length) return { error: "Add at least one email for the scheduled report." };
  return saveJson("records_settings", {
    retention_years: years ?? null,
    export_frequency: freq,
    export_emails: emails.slice(0, 10),
    last_export_at: current.last_export_at,
    time_zone: validTz(str(f, "timeZone")) ?? current.time_zone ?? DEFAULT_TZ,
  });
}

// ---------------------------------------------------------------------------
// Client documents (policies and plans)
// ---------------------------------------------------------------------------

const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export async function uploadDocument(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireTeamAdmin();
  const db = supabaseAdmin();
  const title = str(f, "title").slice(0, 120);
  const file = f.get("file");
  if (!title) return { error: "Give it a title, like “Bloodborne Pathogens Exposure Control Plan”." };
  if (!(file instanceof File) || !file.size) return { error: "Choose a file." };
  const ext = DOC_TYPES[file.type];
  if (!ext) return { error: "Upload a PDF, Word file or image." };
  if (file.size > 10_000_000) return { error: "Files must be under 10 MB." };
  const courseId = str(f, "courseId") || null;
  if (courseId) {
    const { data } = await db.from("courses").select("id").eq("id", courseId).maybeSingle();
    if (!data) return { error: "Course not found." };
  }
  const storage_path = `${s.org.id}/documents/${randomToken(6)}.${ext}`;
  const up = await db.storage.from("org-files").upload(storage_path, file, { contentType: file.type });
  if (up.error) return { error: up.error.message };
  const { error } = await db.from("org_documents").insert({
    org_id: s.org.id,
    title,
    storage_path,
    file_name: file.name.slice(0, 200),
    content_type: file.type,
    size_bytes: file.size,
    course_id: courseId,
    visible_to_learners: str(f, "visible") === "on",
    uploaded_by: s.userId,
  });
  if (error) return { error: error.message };
  await logEvent(s, "document.add", { title });
  revalidatePath("/admin/settings/documents");
  return { ok: `Added ${title}.` };
}

export async function removeDocument(f: FormData) {
  const s = await requireTeamAdmin();
  const db = supabaseAdmin();
  const id = str(f, "id");
  const { data: doc } = await db.from("org_documents").select("title, storage_path").eq("id", id).eq("org_id", s.org.id).maybeSingle();
  if (!doc) return;
  await db.from("org_documents").delete().eq("id", id).eq("org_id", s.org.id);
  await db.storage.from("org-files").remove([doc.storage_path]);
  await logEvent(s, "document.remove", { title: doc.title });
  revalidatePath("/admin/settings/documents");
}
