import Link from "next/link";
import { requireStaff } from "@/lib/staff";
import { fmtDate } from "../../data";
import { PageHead, StatusChip } from "../../ui";
import { statusRows, type ReportFilter } from "./rows";

export default async function Reports({ searchParams }: { searchParams: Promise<ReportFilter> }) {
  const f = await searchParams;
  const s = await requireStaff();
  const { team, rows } = await statusRows(s.org.id, f, s.locationIds);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  const shown = rows.slice(0, 500);

  return (
    <>
      <PageHead eyebrow="✦ Reports" title={<>Who&apos;s <em>done</em></>}>
        <Link href="/admin/dashboards" className="btn btn-ghost btn-sm">See dashboards</Link>
        <a href={`/admin/reports/export?type=status&${qs}`} className="btn btn-primary btn-sm">Download this view (CSV)</a>
      </PageHead>

      <section className="card mb-6 grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="text-2xl">Audit <em>records</em></h2>
          <p className="text-sm text-muted">For inspectors, insurers and lawyers. Opens in Excel or Google Sheets.</p>
        </div>
        <a href="/admin/reports/export?type=completions" className="card card-hover flex flex-col gap-1 p-4 no-underline">
          <span className="font-medium text-ink">Training records</span>
          <span className="text-sm text-muted">Every completion: date, course version, score, minutes spent, tries, language and certificate code.</span>
        </a>
        <a href="/admin/reports/export?type=tries" className="card card-hover flex flex-col gap-1 p-4 no-underline">
          <span className="font-medium text-ink">Quiz tries</span>
          <span className="text-sm text-muted">Every final-check try: date, score and whether it passed.</span>
        </a>
        <a href="/admin/reports/export?type=activity" className="card card-hover flex flex-col gap-1 p-4 no-underline">
          <span className="font-medium text-ink">Manager activity log</span>
          <span className="text-sm text-muted">Who added people, reset PINs and assigned training, and when.</span>
        </a>
      </section>

      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Status</span>
          <select name="status" defaultValue={f.status ?? ""} className="field">
            <option value="">All</option>
            <option value="late">Overdue (incl. retraining)</option>
            <option value="renew">Retraining coming up</option>
            <option value="due">To do</option>
            <option value="done">Done and current</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Course</span>
          <select name="course" defaultValue={f.course ?? ""} className="field max-w-[280px]">
            <option value="">All courses</option>
            {team.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Role</span>
          <select name="role" defaultValue={f.role ?? ""} className="field">
            <option value="">All roles</option>
            {team.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Location</span>
          <select name="location" defaultValue={f.location ?? ""} className="field">
            <option value="">All locations</option>
            {team.locations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary btn-sm">Show</button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[0.95rem]">
          <thead className="label border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Course</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Due / retrain by</th>
              <th className="px-4 py-3 font-semibold">Finished</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Nothing matches.</td></tr>
            )}
            {shown.map((r) => (
              <tr key={`${r.personId}-${r.courseId}`}>
                <td className="px-4 py-3">
                  <Link href={`/admin/people/${r.personId}`} className="font-medium text-ink">{r.name}</Link>
                  <span className="block text-sm text-muted">{[r.role, r.location].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="px-4 py-3">{r.course}</td>
                <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                <td className="px-4 py-3">{fmtDate(r.dueAt)}</td>
                <td className="px-4 py-3">
                  {fmtDate(r.completedAt ?? r.lastFinishedAt)}
                  {r.version ? ` · v${r.version}` : ""}
                  {r.score != null ? ` · ${r.score}%` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        {rows.length > shown.length ? `Showing the first ${shown.length} of ${rows.length}. Download to see them all.` : `${rows.length} rows`}
      </p>
    </>
  );
}
