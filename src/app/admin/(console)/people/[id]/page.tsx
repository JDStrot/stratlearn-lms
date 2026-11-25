import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff";
import { STATUS_ORDER, isToDo, learnerStatuses, repeatLabel } from "@/lib/status";
import { loadOrgSettings } from "@/lib/org-settings";
import { roundStartOf } from "@/lib/attempts";
import { resetAttempts } from "../../../settings-actions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { newBadge, removeAssignment, setActive, unlockPerson } from "../../../actions";
import { fmtDate, loadTeam, nameOf } from "../../../data";
import { PageHead, StatusChip } from "../../../ui";
import { EditPerson, EmailSignIn, ResetPin } from "./forms";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireStaff();
  const team = await loadTeam(s.org.id, s.locationIds);
  const p = team.people.find((x) => x.id === id);
  if (!p) notFound();

  const statuses = learnerStatuses(p, team.assignments, team.completions, new Date(), team.rules.timing);
  const course = new Map(team.courses.map((c) => [c.id, c]));
  statuses.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const direct = team.assignments.filter((a) => a.learner_id === p.id);

  // Failed quiz tries this round, to show "locked" and a "Give more tries" button.
  const [{ quiz }, { data: tries }] = await Promise.all([
    loadOrgSettings(s.org.id),
    supabaseAdmin().from("course_attempts").select("course_id, kind, created_at").eq("learner_id", p.id).order("created_at", { ascending: false }),
  ]);
  const failuresFor = (courseId: string, start: string | null) => {
    const rows = (tries ?? []).filter((t) => t.course_id === courseId);
    const reset = rows.find((t) => t.kind === "reset")?.created_at ?? null;
    const since = [start, reset].filter(Boolean).sort().pop() ?? null;
    return rows.filter((t) => t.kind === "attempt" && (!since || t.created_at > since)).length;
  };

  const { data: certs } = await supabaseAdmin()
    .from("certificates")
    .select("course_id, verify_code, issued_at")
    .eq("learner_id", p.id)
    .eq("org_id", s.org.id)
    .order("issued_at", { ascending: false });
  const cert = new Map<string, string>();
  for (const c of certs ?? []) if (!cert.has(c.course_id)) cert.set(c.course_id, c.verify_code);

  const locked = p.locked_until && new Date(p.locked_until) > new Date();

  return (
    <>
      <p className="mb-2"><Link href="/admin/people" className="label">← All people</Link></p>
      <PageHead eyebrow={`✦ ${nameOf(team.roles, p.job_role_id) || "Team member"}`} title={p.display_name}>
        <Link href={`/admin/people/${p.id}/preview`} className="btn btn-ghost btn-sm">View as {p.display_name.split(" ")[0]}</Link>
        <Link href={`/admin/badges?ids=${p.id}`} className="btn btn-ghost btn-sm">Print badge</Link>
        <Link href={`/admin/assign?who=person:${p.id}`} className="btn btn-primary btn-sm">Assign training</Link>
      </PageHead>

      {!p.is_active && (
        <p className="mb-6 rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-error">
          This person is turned off and can&apos;t sign in. Their records are kept.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-6">
          <h2 className="mb-4 text-3xl">Training</h2>
          {statuses.length === 0 ? (
            <p className="text-muted">Nothing assigned yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {statuses.map((st) => {
                const c = course.get(st.courseId);
                const fails = isToDo(st.status) ? failuresFor(st.courseId, roundStartOf(st.lastFinishedAt, st.retakeAfter, null)) : 0;
                const locked = quiz.max_attempts != null && fails >= quiz.max_attempts;
                return (
                  <li key={st.courseId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span>
                      <span className="font-medium">{c?.title ?? "Course"}</span>
                      <span className="block text-sm text-muted">
                        {st.completedAt ? `Finished ${fmtDate(st.completedAt)}` : st.dueAt ? `Due ${fmtDate(st.dueAt)}` : "No due date"}
                        {st.completedAt && st.completedVersion ? ` (v${st.completedVersion})` : ""}
                        {st.completedAt && st.recurrenceMonths ? ` · retrain by ${fmtDate(st.dueAt)}` : ""}
                        {st.recurrenceMonths ? ` · repeats ${repeatLabel(st.recurrenceMonths).toLowerCase()}` : ""}
                        {!st.completedAt && st.lastFinishedAt ? ` · last finished ${fmtDate(st.lastFinishedAt)}` : ""}
                        {fails ? ` · ${fails} failed ${fails === 1 ? "try" : "tries"}` : ""}
                        {st.score != null ? ` · score ${st.score}%` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {locked && (
                        <form action={resetAttempts}>
                          <input type="hidden" name="learnerId" value={p.id} />
                          <input type="hidden" name="courseId" value={st.courseId} />
                          <button className="btn btn-primary btn-sm">Give more tries</button>
                        </form>
                      )}
                      {cert.get(st.courseId) && (
                        <Link href={`/verify/${cert.get(st.courseId)}`} className="chip no-underline">Certificate</Link>
                      )}
                      <StatusChip status={st.status} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {direct.length > 0 && (
            <details className="mt-5 text-sm">
              <summary className="label cursor-pointer text-plum">Assigned just to {p.display_name.split(" ")[0]} ({direct.length})</summary>
              <ul className="mt-2 divide-y divide-line">
                {direct.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{course.get(a.course_id)?.title}</span>
                    <form action={removeAssignment}>
                      <input type="hidden" name="ids" value={a.id} />
                      <button className="label text-error">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className="card p-6">
            <h2 className="mb-1 text-3xl">Sign-in <em>help</em></h2>
            <p className="mb-4 text-sm text-muted">
              Team code <b className="text-plum">{s.org.join_code}</b> · sign-in name <b className="text-plum">{p.username}</b>
              {p.last_login_at ? ` · last in ${fmtDate(p.last_login_at)}` : " · never signed in"}
            </p>
            {locked && (
              <form action={unlockPerson} className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-error/30 bg-error/5 px-4 py-3">
                <input type="hidden" name="id" value={p.id} />
                <span className="text-sm text-error">Locked out after 5 wrong PINs.</span>
                <button className="btn btn-primary btn-sm">Unlock</button>
              </form>
            )}
            <ResetPin id={p.id} />
            <form action={newBadge} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <input type="hidden" name="id" value={p.id} />
              <span className="text-sm text-muted">Lost badge? Make a new QR code. The old one stops working.</span>
              <button className="btn btn-ghost btn-sm">New QR badge</button>
            </form>
            <div className="mt-4 border-t border-line pt-4">
              <EmailSignIn id={p.id} email={p.email} />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-3xl">Details</h2>
            <EditPerson
              person={p}
              role={nameOf(team.roles, p.job_role_id)}
              location={nameOf(team.locations, p.location_id)}
              roles={team.roles.map((r) => r.name)}
              locations={team.locations.map((l) => l.name)}
            />
            <form action={setActive} className="mt-5 border-t border-line pt-4">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="active" value={p.is_active ? "0" : "1"} />
              <button className={`label ${p.is_active ? "text-error" : "text-success"}`}>
                {p.is_active ? "Turn off (left the team)" : "Turn back on"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
