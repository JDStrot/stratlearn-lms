import "server-only";
import { STATUS_ORDER, isCurrent, isLate, type Status } from "@/lib/status";
import { loadTeam, nameOf, teamStatus } from "../../data";

export type ReportFilter = { status?: string; role?: string; location?: string; course?: string };

/** One row per person per assigned course, filtered like the Reports page. */
export async function statusRows(orgId: string, f: ReportFilter, locationIds: string[] | null = null) {
  const team = await loadTeam(orgId, locationIds);
  const course = new Map(team.courses.map((c) => [c.id, c.title]));
  const rows: {
    personId: string;
    name: string;
    username: string;
    employeeId: string;
    role: string;
    location: string;
    courseId: string;
    course: string;
    status: Status;
    dueAt: string | null;
    completedAt: string | null;
    score: number | null;
    version: number | null;
    repeats: number | null;
    lastFinishedAt: string | null;
  }[] = [];
  for (const { person, statuses } of teamStatus(team)) {
    if (f.role && person.job_role_id !== f.role) continue;
    if (f.location && person.location_id !== f.location) continue;
    for (const st of statuses) {
      if (f.course && st.courseId !== f.course) continue;
      if (f.status === "late" && !isLate(st.status)) continue;
      if (f.status === "done" && !isCurrent(st.status)) continue;
      if (f.status === "due" && st.status !== "due") continue;
      if (f.status === "renew" && st.status !== "renew") continue;
      rows.push({
        personId: person.id,
        name: person.display_name,
        username: person.username,
        employeeId: person.employee_id ?? "",
        role: nameOf(team.roles, person.job_role_id),
        location: nameOf(team.locations, person.location_id),
        courseId: st.courseId,
        course: course.get(st.courseId) ?? "",
        status: st.status,
        dueAt: st.dueAt,
        completedAt: st.completedAt,
        score: st.score,
        version: st.completedVersion,
        repeats: st.recurrenceMonths,
        lastFinishedAt: st.lastFinishedAt,
      });
    }
  }
  rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name) || a.course.localeCompare(b.course));
  return { team, rows };
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    // Stop spreadsheet apps from running cell text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
