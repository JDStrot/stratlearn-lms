import { NextResponse, type NextRequest } from "next/server";
import { logEvent, requireStaff } from "@/lib/staff";
import { STATUS_LABEL, isCurrent, repeatLabel } from "@/lib/status";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { statusRows, toCsv } from "../rows";

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

export async function GET(req: NextRequest) {
  const s = await requireStaff();
  const p = req.nextUrl.searchParams;
  const type = p.get("type") ?? "status";
  const stamp = new Date().toISOString().slice(0, 10);
  const team = s.org.join_code.toLowerCase();
  let csv: string;
  let name: string;

  if (type === "completions") {
    const db = supabaseAdmin();
    const cols =
      "completed_at, course_version, language, score, learners(display_name, username, employee_id), courses(slug, title), certificates(verify_code)";
    const query = (extra: string) =>
      db
        .from("completions")
        .select(cols + extra)
        .eq("org_id", s.org.id)
        .order("completed_at", { ascending: false })
        .limit(100000);
    // Time and tries columns exist once the time-and-tries database update has run.
    const full = await query(", seconds_spent, attempts");
    const data = full.error ? (await query("")).data : full.data;
    type Row = {
      completed_at: string;
      course_version: number;
      language: string | null;
      score: number | null;
      seconds_spent?: number | null;
      attempts?: number | null;
      learners: { display_name: string; username: string; employee_id: string | null } | null;
      courses: { slug: string; title: string } | null;
      certificates: { verify_code: string; expires_at: string | null }[] | { verify_code: string; expires_at: string | null } | null;
    };
    const origin = req.nextUrl.origin;
    csv = toCsv(
      ["Name", "Sign-in name", "Employee ID", "Course", "Course ID", "Version", "Completed (UTC)", "Valid until", "Score", "Language", "Certificate code", "Verify link"],
      ((data ?? []) as unknown as Row[]).map((r) => {
        const cert = Array.isArray(r.certificates) ? r.certificates[0] : r.certificates;
        return [
          r.learners?.display_name,
          r.learners?.username,
          r.learners?.employee_id,
          r.courses?.title,
          r.courses?.slug,
          r.course_version,
          r.completed_at.replace("T", " ").slice(0, 19),
          day(cert?.expires_at),
          r.score,
          r.seconds_spent ? Math.round(r.seconds_spent / 6) / 10 : "",
          r.attempts ?? "",
          r.language,
          cert?.verify_code,
          cert ? `${origin}/verify/${cert.verify_code}` : "",
        ];
      }),
    );
    name = `${team}-training-records-${stamp}.csv`;
  } else if (type === "tries") {
    const { data } = await supabaseAdmin()
      .from("quiz_attempts")
      .select("attempted_at, score, passed, language, learners(display_name, username, employee_id), courses(slug, title)")
      .eq("org_id", s.org.id)
      .order("attempted_at", { ascending: false })
      .limit(100000);
    type Try = {
      attempted_at: string;
      score: number | null;
      passed: boolean;
      language: string | null;
      learners: { display_name: string; username: string; employee_id: string | null } | null;
      courses: { slug: string; title: string } | null;
    };
    csv = toCsv(
      ["Name", "Sign-in name", "Employee ID", "Course", "Course ID", "When (UTC)", "Score", "Result", "Language"],
      ((data ?? []) as unknown as Try[]).map((r) => [
        r.learners?.display_name,
        r.learners?.username,
        r.learners?.employee_id,
        r.courses?.title,
        r.courses?.slug,
        r.attempted_at.replace("T", " ").slice(0, 19),
        r.score,
        r.passed ? "Passed" : "Not passed",
        r.language,
      ]),
    );
    name = `${team}-quiz-tries-${stamp}.csv`;
  } else if (type === "activity") {
    const { data } = await supabaseAdmin()
      .from("admin_events")
      .select("created_at, actor_id, action, details")
      .eq("org_id", s.org.id)
      .order("created_at", { ascending: false })
      .limit(20000);
    const { data: users } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    const email = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    csv = toCsv(
      ["When (UTC)", "Manager", "Action", "Details"],
      (data ?? []).map((r) => [r.created_at.replace("T", " ").slice(0, 19), email.get(r.actor_id) ?? "", r.action, JSON.stringify(r.details)]),
    );
    name = `${team}-manager-activity-${stamp}.csv`;
  } else {
    const { rows } = await statusRows(s.org.id, {
      status: p.get("status") ?? undefined,
      role: p.get("role") ?? undefined,
      location: p.get("location") ?? undefined,
      course: p.get("course") ?? undefined,
    });
    csv = toCsv(
      ["Name", "Sign-in name", "Employee ID", "Role", "Location", "Course", "Status", "Compliant now", "Due / retrain by", "Last finished", "Version finished", "Score", "Repeats"],
      rows.map((r) => [
        r.name,
        r.username,
        r.employeeId,
        r.role,
        r.location,
        r.course,
        STATUS_LABEL[r.status],
        isCurrent(r.status) ? "Yes" : "No",
        day(r.dueAt),
        day(r.completedAt ?? r.lastFinishedAt),
        r.version,
        r.score,
        repeatLabel(r.repeats),
      ]),
    );
    name = `${team}-training-status-${stamp}.csv`;
  }

  await logEvent(s, "report.export", { type });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
