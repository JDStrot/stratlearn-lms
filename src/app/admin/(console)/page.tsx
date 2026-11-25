import Link from "next/link";
import { requireStaff } from "@/lib/staff";
import { isCurrent, isLate } from "@/lib/status";
import { fmtDate, loadTeam, nameOf, teamStatus } from "../data";
import { PageHead, Stat, StatusChip } from "../ui";

export default async function Overview() {
  const s = await requireStaff();
  const team = await loadTeam(s.org.id);
  const rows = teamStatus(team);
  const courseTitle = new Map(team.courses.map((c) => [c.id, c.title]));

  let assigned = 0;
  let done = 0;
  const late: { personId: string; name: string; course: string; status: "overdue" | "expired"; dueAt: string | null }[] = [];
  const soon: typeof late = [];
  const weekAhead = Date.now() + 7 * 864e5;
  for (const { person, statuses } of rows) {
    for (const st of statuses) {
      assigned++;
      if (isCurrent(st.status)) done++;
      if (isLate(st.status))
        late.push({ personId: person.id, name: person.display_name, course: courseTitle.get(st.courseId) ?? "", status: st.status as "overdue", dueAt: st.dueAt });
      else if ((st.status === "due" || st.status === "renew") && st.dueAt && new Date(st.dueAt).getTime() < weekAhead)
        soon.push({ personId: person.id, name: person.display_name, course: courseTitle.get(st.courseId) ?? "", status: "overdue", dueAt: st.dueAt });
    }
  }
  const peopleLate = new Set(late.map((l) => l.personId)).size;
  const pct = assigned ? Math.round((done / assigned) * 100) : 0;
  const since = Date.now() - 30 * 864e5;
  const recent = team.completions.filter((c) => new Date(c.completed_at).getTime() > since).length;
  const active = rows.length;
  const signedIn = rows.filter((r) => r.person.last_login_at).length;

  // Completion by role, for a quick "where are we behind?" view.
  const byRole = new Map<string, { done: number; total: number }>();
  for (const { person, statuses } of rows) {
    const key = nameOf(team.roles, person.job_role_id) || "No role";
    const agg = byRole.get(key) ?? { done: 0, total: 0 };
    agg.total += statuses.length;
    agg.done += statuses.filter((x) => x.status === "done").length;
    byRole.set(key, agg);
  }

  return (
    <>
      <PageHead eyebrow={`✦ ${s.org.name}`} title={<>Team <em>overview</em></>}>
        <Link href="/admin/people?add=1" className="btn btn-primary btn-sm">Add people</Link>
        <Link href="/admin/assign" className="btn btn-ghost btn-sm">Assign training</Link>
      </PageHead>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="People" value={active} note={`${signedIn} have signed in`} />
        <Stat label="Training done" value={`${pct}%`} note={`${done} of ${assigned} assigned courses`} tone={pct >= 90 ? "good" : undefined} />
        <Stat label="Overdue" value={late.length} note={`${peopleLate} ${peopleLate === 1 ? "person" : "people"} behind`} tone={late.length ? "bad" : "good"} />
        <Stat label="Finished, last 30 days" value={recent} note="courses completed" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-3xl">Overdue <em>now</em></h2>
            {late.length > 0 && <Link href="/admin/reports?status=late" className="label">See all</Link>}
          </div>
          {late.length === 0 ? (
            <p className="text-muted">Nobody is overdue. Nice.</p>
          ) : (
            <ul className="divide-y divide-line">
              {late.slice(0, 10).map((l, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <Link href={`/admin/people/${l.personId}`} className="font-medium text-ink">{l.name}</Link>
                    <span className="block text-sm text-muted">{l.course}{l.dueAt ? ` · due ${fmtDate(l.dueAt)}` : ""}</span>
                  </span>
                  <StatusChip status={l.status} />
                </li>
              ))}
            </ul>
          )}
          {soon.length > 0 && (
            <p className="mt-4 rounded-[10px] bg-mist/60 px-4 py-3 text-sm">
              {soon.length} more {soon.length === 1 ? "course is" : "courses are"} due in the next 7 days.
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-3xl">By <em>role</em></h2>
          {byRole.size === 0 ? (
            <p className="text-muted">Add people and assign training to see progress here.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {[...byRole].map(([role, a]) => {
                const p = a.total ? Math.round((a.done / a.total) * 100) : 0;
                return (
                  <li key={role}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{role}</span><span className="text-muted">{p}%</span></div>
                    <div className="progress" role="progressbar" aria-label={`${role} progress`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${p}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-6 rounded-[12px] border border-line bg-paper p-4 text-sm">
            <p className="label mb-1 text-plum">Team code</p>
            <p className="font-serif text-3xl text-plum">{s.org.join_code}</p>
            <p className="text-muted">Workers type this with their name and PIN.</p>
          </div>
        </section>
      </div>
    </>
  );
}
