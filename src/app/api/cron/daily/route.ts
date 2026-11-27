import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { reportError } from "@/lib/alerts";
import { readNotify, readRecords } from "@/lib/org-settings";
import { dayIn } from "@/lib/time-zones";
import { locationZones } from "@/lib/team-time";
import { STATUS_LABEL, isLate, type Status } from "@/lib/status";
import { loadTeam, teamStatus } from "@/app/admin/data";
import { statusRows, toCsv } from "@/app/admin/(console)/reports/rows";
import { addBusinessDays } from "@/lib/trainer";

/**
 * Runs once a day (vercel.json, 14:00 UTC = 6-7 AM Pacific):
 *  1. reminds workers (who have an email) about training due soon or late
 *  2. tells managers about training that's been overdue too long
 *  3. emails scheduled training reports
 *  4. Ask a trainer: reminds the trainer about a question after 1 business
 *     day, and tells managers after 2 (or right away when no trainer is set)
 * Every message is written to notification_log, so nobody gets the same
 * reminder twice within the team's "repeat every" window.
 */
export const maxDuration = 300;

const DAY = 86_400_000;
const SITE = process.env.SITE_URL ?? "https://learn.stratlearn.co";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "not allowed" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: orgs } = await db.from("organizations").select("*").eq("status", "active");
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailOf = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const summary: Record<string, { reminders: number; escalations: number; report: boolean; questions: number }> = {};

  for (const org of orgs ?? []) {
    try {
      summary[org.join_code] = await runOrg(org, emailOf);
    } catch (e) {
      console.error("cron org failed", org.join_code, e);
      await reportError({ source: "cron", message: `Daily job failed for team ${org.join_code}: ${e instanceof Error ? e.message : String(e)}`, path: "/api/cron/daily" });
    }
  }
  return NextResponse.json({ ok: true, summary });
}

type Org = { id: string; name: string; join_code: string; notify_settings?: unknown; records_settings?: unknown };

async function runOrg(org: Org, emailOf: Map<string, string>) {
  const db = supabaseAdmin();
  const notify = readNotify(org.notify_settings);
  // Dates in emails and the CSV use the team's time zone.
  const records = readRecords(org.records_settings);
  // Each person's dates in their location's time zone (else the team's).
  const { zoneOf } = await locationZones(org.id);
  const day = (iso: string | null | undefined, loc?: string | null) => dayIn(iso, zoneOf(loc));
  const now = Date.now();
  const team = await loadTeam(org.id);
  const title = new Map(team.courses.map((c) => [c.id, c.title]));
  const grace = team.rules.settings.grace_days * DAY;

  // What was already sent recently, by (kind, learner, course).
  const windowDays = Math.max(notify.remind_every_days || 3650, 1);
  const { data: recent } = await db
    .from("notification_log")
    .select("kind, learner_id, course_id, created_at")
    .eq("org_id", org.id)
    .gte("created_at", new Date(now - windowDays * DAY).toISOString());
  const already = new Set((recent ?? []).map((r) => `${r.kind}|${r.learner_id}|${r.course_id}`));
  const log: { org_id: string; kind: string; learner_id?: string; course_id?: string; sent_to: string; status: string }[] = [];

  // 1. Reminders to workers.
  let reminders = 0;
  if (notify.remind_before_days > 0 || notify.remind_every_days > 0) {
    for (const { person, statuses } of teamStatus(team)) {
      if (!person.email) continue;
      const items = statuses.filter((st) => {
        if (st.status === "done" || !st.dueAt) return false;
        const daysLeft = (new Date(st.dueAt).getTime() - now) / DAY;
        const due = isLate(st.status) || daysLeft <= notify.remind_before_days;
        return due && !already.has(`reminder|${person.id}|${st.courseId}`);
      });
      if (!items.length) continue;
      const es = person.preferred_language === "es";
      const lines = items.map((st) => `• ${title.get(st.courseId) ?? "Course"} (${es ? "vence" : "due"} ${day(st.dueAt, person.location_id)})`);
      const status = await sendEmail({
        to: [person.email],
        subject: es ? `Tienes capacitación pendiente en ${org.name}` : `Training due at ${org.name}`,
        text: es
          ? `Hola ${person.display_name.split(" ")[0]},\n\nTienes capacitación pendiente:\n${lines.join("\n")}\n\nEntra aquí: ${SITE}\n\n¡Gracias!`
          : `Hi ${person.display_name.split(" ")[0]},\n\nYou have training to finish:\n${lines.join("\n")}\n\nSign in here: ${SITE}\n\nThanks!`,
      });
      for (const st of items) log.push({ org_id: org.id, kind: "reminder", learner_id: person.id, course_id: st.courseId, sent_to: person.email, status });
      reminders++;
    }
  }

  // 2. Overdue too long: tell managers (limited managers only hear about their locations).
  let escalations = 0;
  if (notify.escalate_after_days > 0) {
    const late: { personId: string; name: string; locationId: string | null; courseId: string; status: Status; dueAt: string }[] = [];
    for (const { person, statuses } of teamStatus(team)) {
      for (const st of statuses) {
        if (!isLate(st.status) || !st.dueAt) continue;
        const daysLate = (now - new Date(st.dueAt).getTime() - grace) / DAY;
        if (daysLate < notify.escalate_after_days) continue;
        if (already.has(`escalation|${person.id}|${st.courseId}`)) continue;
        late.push({ personId: person.id, name: person.display_name, locationId: person.location_id, courseId: st.courseId, status: st.status, dueAt: st.dueAt });
      }
    }
    if (late.length) {
      const { data: staff } = await db.from("staff_members").select("user_id, role, location_ids").eq("org_id", org.id);
      for (const m of staff ?? []) {
        if (notify.escalate_to === "owners" && m.role === "manager") continue;
        const email = emailOf.get(m.user_id);
        if (!email) continue;
        const scope = m.role === "manager" && (m.location_ids as string[] | null)?.length ? (m.location_ids as string[]) : null;
        const mine = late.filter((l) => !scope || (l.locationId && scope.includes(l.locationId)));
        if (!mine.length) continue;
        const status = await sendEmail({
          to: [email],
          subject: `${mine.length} overdue training ${mine.length === 1 ? "item" : "items"} at ${org.name}`,
          text:
            `These are more than ${notify.escalate_after_days} days overdue:\n\n` +
            mine.map((l) => `• ${l.name}: ${title.get(l.courseId) ?? "Course"} (${STATUS_LABEL[l.status]}, due ${day(l.dueAt, l.locationId)})`).join("\n") +
            `\n\nSee who's behind: ${SITE}/admin/reports?status=late`,
        });
        log.push({ org_id: org.id, kind: "escalation_digest", sent_to: email, status });
        if (status === "sent") escalations++;
      }
      if (escalations) for (const l of late) log.push({ org_id: org.id, kind: "escalation", learner_id: l.personId, course_id: l.courseId, sent_to: "managers", status: "sent" });
    }
  }

  // 3. Scheduled training report.
  let report = false;
  const today = new Date(now);
  const last = records.last_export_at ? new Date(records.last_export_at).getTime() : 0;
  const dueReport =
    records.export_emails.length > 0 &&
    ((records.export_frequency === "weekly" && today.getUTCDay() === 1 && now - last > 6 * DAY) ||
      (records.export_frequency === "monthly" && today.getUTCDate() === 1 && now - last > 27 * DAY));
  if (dueReport) {
    const { rows } = await statusRows(org.id, {});
    const csv = toCsv(
      ["Name", "Sign-in name", "Employee ID", "Role", "Location", "Course", "Status", "Due / retrain by", "Last finished", "Version", "Score"],
      rows.map((r) => [r.name, r.username, r.employeeId, r.role, r.location, r.course, STATUS_LABEL[r.status], day(r.dueAt, r.locationId), day(r.completedAt ?? r.lastFinishedAt, r.locationId), r.version, r.score]),
    );
    const late = rows.filter((r) => isLate(r.status)).length;
    const status = await sendEmail({
      to: records.export_emails,
      subject: `${org.name} training report, ${day(today.toISOString())}`,
      text: `Attached: training status for everyone at ${org.name}. ${late} overdue.\n\nLive view: ${SITE}/admin/reports`,
      attachments: [{ filename: `${org.join_code.toLowerCase()}-training-status-${day(today.toISOString())}.csv`, content: csv }],
    });
    log.push({ org_id: org.id, kind: "report", sent_to: records.export_emails.join(", "), status });
    if (status === "sent")
      await db.from("organizations").update({ records_settings: { ...records, last_export_at: today.toISOString() } }).eq("id", org.id);
    report = status === "sent";
  }

  // Only remember sends that actually went out, so they're retried once email is on.
  const keep = log.filter((l) => l.status === "sent" || l.kind === "escalation_digest" || l.kind === "report");
  if (keep.length) await db.from("notification_log").insert(keep);
  const questions = await followUpQuestions(org, emailOf).catch((e) => {
    console.error("question follow-up failed", org.join_code, e);
    return 0;
  });
  return { reminders, escalations, report, questions };
}

/** Ask a trainer follow-ups. Does nothing until the Ask a trainer database update has run. */
async function followUpQuestions(org: Org, emailOf: Map<string, string>) {
  const db = supabaseAdmin();
  const { data: open, error } = await db
    .from("trainer_questions")
    .select("id, created_at, question, token, sent_to, reminded_at, escalated_at, learners(display_name, location_id), courses(title)")
    .eq("org_id", org.id)
    .eq("status", "open")
    .limit(500);
  if (error || !open?.length) return 0;
  type Q = {
    id: string;
    created_at: string;
    question: string;
    token: string;
    sent_to: { name?: string; email?: string | null } | null;
    reminded_at: string | null;
    escalated_at: string | null;
    learners: { display_name: string; location_id: string | null } | null;
    courses: { title: string } | null;
  };
  const now = Date.now();
  const rows = open as unknown as Q[];
  let sent = 0;

  // Trainer reminder after 1 business day.
  for (const q of rows) {
    const email = q.sent_to?.email;
    if (!email || q.reminded_at || addBusinessDays(new Date(q.created_at), 1).getTime() > now) continue;
    const status = await sendEmail({
      to: [email],
      subject: `Reminder: ${q.learners?.display_name ?? "A worker"} is waiting for an answer`,
      text:
        `${q.learners?.display_name ?? "A worker"} at ${org.name} asked this in ${q.courses?.title ?? "a course"}:\n\n${q.question}\n\n` +
        `Answer here (no sign-in needed): ${SITE}/answer/${q.token}\n\nPlease answer within two business days of the question.`,
    });
    if (status === "sent") {
      await db.from("trainer_questions").update({ reminded_at: new Date().toISOString() }).eq("id", q.id);
      sent++;
    }
  }

  // Managers after 2 business days, or right away when no trainer email was set.
  const late = rows.filter((q) => !q.escalated_at && (!q.sent_to?.email || addBusinessDays(new Date(q.created_at), 2).getTime() <= now));
  if (!late.length) return sent;
  const { data: staff } = await db.from("staff_members").select("user_id, role, location_ids").eq("org_id", org.id);
  const told = new Set<string>();
  for (const m of staff ?? []) {
    const email = emailOf.get(m.user_id);
    if (!email) continue;
    const scope = m.role === "manager" && (m.location_ids as string[] | null)?.length ? (m.location_ids as string[]) : null;
    const mine = late.filter((q) => !scope || (q.learners?.location_id && scope.includes(q.learners.location_id)));
    if (!mine.length) continue;
    const status = await sendEmail({
      to: [email],
      subject: `${mine.length} training ${mine.length === 1 ? "question needs" : "questions need"} an answer at ${org.name}`,
      text:
        `Workers asked these through Ask a trainer and are still waiting:\n\n` +
        mine
          .map((q) => `• ${q.learners?.display_name ?? "Someone"} (${q.courses?.title ?? "course"}): ${q.question.slice(0, 200)}${q.sent_to?.email ? "" : " [no trainer set]"}`)
          .join("\n") +
        `\n\nAnswer them here: ${SITE}/admin/questions`,
    });
    if (status === "sent") for (const q of mine) told.add(q.id);
  }
  if (told.size) await db.from("trainer_questions").update({ escalated_at: new Date().toISOString() }).in("id", [...told]);
  return sent + told.size;
}

