import { NextResponse, type NextRequest } from "next/server";
import { inScope, logEvent, requireStaff } from "@/lib/staff";
import { STATUS_LABEL, isCurrent, repeatLabel } from "@/lib/status";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { statusRows, toCsv } from "../rows";
import { dateTimeIn, dayIn, tzShort } from "@/lib/time-zones";
import { locationZones } from "@/lib/team-time";

export async function GET(req: NextRequest) {
  const s = await requireStaff();
  const p = req.nextUrl.searchParams;
  const type = p.get("type") ?? "status";
  // Dates and times in each person's location time zone (else the team's).
  const { zoneOf } = await locationZones(s.org.id);
  const day = (iso: string | null | undefined, loc?: string | null) => dayIn(iso, zoneOf(loc));
  const when = (iso: string | null | undefined, loc?: string | null) => dateTimeIn(iso, zoneOf(loc));
  // One zone for the whole file: name it in the header. Several: add a column.
  const header = (label: string, locs: (string | null | undefined)[]) => {
    const zones = new Set(locs.map((l) => zoneOf(l)));
    const one = zones.size <= 1;
    return { label: `${label} (${one ? tzShort([...zones][0] ?? zoneOf(null)) : "local time"})`, extra: !one };
  };
  const stamp = day(new Date().toISOString(), s.locationIds?.[0]);
  const team = s.org.join_code.toLowerCase();
  let csv: string;
  let name: string;

  if (type === "completions") {
    const db = supabaseAdmin();
    const cols =
      "completed_at, course_version, language, score, learners(display_name, username, employee_id, location_id), courses(slug, title), certificates(verify_code, expires_at)";
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
      learners: { display_name: string; username: string; employee_id: string | null; location_id: string | null } | null;
      courses: { slug: string; title: string } | null;
      certificates: { verify_code: string; expires_at: string | null }[] | { verify_code: string; expires_at: string | null } | null;
    };
    const origin = req.nextUrl.origin;
    const list = ((data ?? []) as unknown as Row[]).filter((r) => inScope(s, r.learners?.location_id ?? null));
    const h = header("Completed", list.map((r) => r.learners?.location_id));
    csv = toCsv(
      ["Name", "Sign-in name", "Employee ID", "Course", "Course ID", "Version", h.label, ...(h.extra ? ["Time zone"] : []), "Valid until", "Score", "Minutes spent", "Final-check tries", "Language", "Certificate code", "Verify link"],
      list.map((r) => {
        const cert = Array.isArray(r.certificates) ? r.certificates[0] : r.certificates;
        const loc = r.learners?.location_id;
        return [
          r.learners?.display_name,
          r.learners?.username,
          r.learners?.employee_id,
          r.courses?.title,
          r.courses?.slug,
          r.course_version,
          when(r.completed_at, loc),
          ...(h.extra ? [tzShort(zoneOf(loc))] : []),
          day(cert?.expires_at, loc),
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
    // Every final-check try: failed ones (course_attempts) and passes (completions).
    const db = supabaseAdmin();
    const who = "learners(display_name, username, employee_id, location_id), courses(slug, title)";
    const [fails, passes] = await Promise.all([
      db.from("course_attempts").select(`created_at, score, ${who}`).eq("org_id", s.org.id).eq("kind", "attempt").limit(100000),
      db.from("completions").select(`completed_at, score, language, ${who}`).eq("org_id", s.org.id).limit(100000),
    ]);
    type Who = {
      learners: { display_name: string; username: string; employee_id: string | null; location_id: string | null } | null;
      courses: { slug: string; title: string } | null;
    };
    const rows = [
      ...((fails.data ?? []) as unknown as (Who & { created_at: string; score: number | null })[]).map((r) => ({ ...r, at: r.created_at, passed: false })),
      ...((passes.data ?? []) as unknown as (Who & { completed_at: string; score: number | null })[]).map((r) => ({ ...r, at: r.completed_at, passed: true })),
    ]
      .filter((r) => inScope(s, r.learners?.location_id ?? null))
      .sort((a, b) => b.at.localeCompare(a.at));
    const h = header("When", rows.map((r) => r.learners?.location_id));
    csv = toCsv(
      ["Name", "Sign-in name", "Employee ID", "Course", "Course ID", h.label, ...(h.extra ? ["Time zone"] : []), "Score", "Result"],
      rows.map((r) => [
        r.learners?.display_name,
        r.learners?.username,
        r.learners?.employee_id,
        r.courses?.title,
        r.courses?.slug,
        when(r.at, r.learners?.location_id),
        ...(h.extra ? [tzShort(zoneOf(r.learners?.location_id))] : []),
        r.score,
        r.passed ? "Passed" : "Not passed",
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
      [`When (${tzShort(zoneOf(s.locationIds?.[0]))})`, "Manager", "Action", "Details"],
      (data ?? []).map((r) => [when(r.created_at, s.locationIds?.[0]), email.get(r.actor_id) ?? "", r.action, JSON.stringify(r.details)]),
    );
    name = `${team}-manager-activity-${stamp}.csv`;
  } else {
    const { rows } = await statusRows(s.org.id, {
      status: p.get("status") ?? undefined,
      role: p.get("role") ?? undefined,
      location: p.get("location") ?? undefined,
      course: p.get("course") ?? undefined,
    }, s.locationIds);
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
        day(r.dueAt, r.locationId),
        day(r.completedAt ?? r.lastFinishedAt, r.locationId),
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
