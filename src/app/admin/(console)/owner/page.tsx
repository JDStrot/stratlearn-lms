import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { learnerStatuses, type AssignmentRow, type CompletionRow } from "@/lib/status";
import { openClient, requireOwner } from "../../owner-actions";
import { fmtDate } from "../../data";
import { PageHead, Stat } from "../../ui";
import { NewClient } from "./new-client";

export const metadata = { title: "STRATLEARN · Owner portal" };

/** Jesse's view across every client. */
export default async function OwnerHome() {
  await requireOwner();
  const db = supabaseAdmin();
  const [orgs, learners, assignments, completions, packs] = await Promise.all([
    db.from("organizations").select("id, name, join_code, plan, status, seat_limit, created_at").order("name"),
    db.from("learners").select("id, org_id, job_role_id, location_id, is_active, last_login_at").limit(100000),
    db.from("assignments").select("id, org_id, course_id, learner_id, job_role_id, location_id, due_at, recurrence_months, created_at").limit(100000),
    db.from("completions").select("org_id, learner_id, course_id, completed_at").limit(200000),
    db.from("packs").select("id, title").eq("is_published", true).order("title"),
  ]);

  type Agg = { people: number; assigned: number; done: number; late: number; lastActive: string | null; month: number };
  const agg = new Map<string, Agg>();
  const monthAgo = Date.now() - 30 * 864e5;
  const byOrg = <T extends { org_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) m.set(r.org_id, [...(m.get(r.org_id) ?? []), r]);
    return m;
  };
  const L = byOrg(learners.data), A = byOrg(assignments.data), C = byOrg(completions.data);
  for (const o of orgs.data ?? []) {
    const a: Agg = { people: 0, assigned: 0, done: 0, late: 0, lastActive: null, month: 0 };
    const as = (A.get(o.id) ?? []) as AssignmentRow[];
    const cs = (C.get(o.id) ?? []) as CompletionRow[];
    for (const l of L.get(o.id) ?? []) {
      if (!l.is_active) continue;
      a.people++;
      if (l.last_login_at && (!a.lastActive || l.last_login_at > a.lastActive)) a.lastActive = l.last_login_at;
      for (const st of learnerStatuses(l, as, cs)) {
        a.assigned++;
        if (st.status === "done") a.done++;
        if (st.status === "overdue" || st.status === "expired") a.late++;
      }
    }
    a.month = cs.filter((c) => new Date(c.completed_at).getTime() > monthAgo).length;
    agg.set(o.id, a);
  }
  const totals = [...agg.values()].reduce(
    (t, a) => ({ people: t.people + a.people, assigned: t.assigned + a.assigned, done: t.done + a.done, late: t.late + a.late, month: t.month + a.month }),
    { people: 0, assigned: 0, done: 0, late: 0, month: 0 },
  );
  const clients = (orgs.data ?? []).length;

  return (
    <>
      <PageHead eyebrow="★ STRATLEARN owner portal" title={<>All <em>clients</em></>}>
        <Link href="/admin/owner/dashboards" className="btn btn-primary btn-sm">Platform dashboards</Link>
        <Link href="/admin/owner/library" className="btn btn-ghost btn-sm">Course library</Link>
        <Link href="/admin/owner/certificates" className="btn btn-ghost btn-sm">Certificate lookup</Link>
      </PageHead>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients" value={clients} note={`${(orgs.data ?? []).filter((o) => o.status === "active").length} active`} />
        <Stat label="Learners" value={totals.people} />
        <Stat label="Training done" value={`${totals.assigned ? Math.round((totals.done / totals.assigned) * 100) : 0}%`} note={`${totals.month} finished in the last 30 days`} />
        <Stat label="Overdue" value={totals.late} tone={totals.late ? "bad" : "good"} note="across all clients" />
      </div>

      <div className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[0.95rem]">
          <thead className="label border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Seats</th>
              <th className="px-4 py-3 font-semibold">Done</th>
              <th className="px-4 py-3 font-semibold">Overdue</th>
              <th className="px-4 py-3 font-semibold">Last active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(orgs.data ?? []).map((o) => {
              const a = agg.get(o.id)!;
              const pct = a.assigned ? Math.round((a.done / a.assigned) * 100) : 0;
              return (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/owner/clients/${o.id}`} className="font-medium text-ink">{o.name}</Link>
                    <span className="block text-sm text-muted">{o.join_code}{o.status !== "active" ? ` · ${o.status}` : ""}</span>
                  </td>
                  <td className="px-4 py-3"><span className="chip">{o.plan}</span></td>
                  <td className="px-4 py-3">{a.people}{o.seat_limit ? ` / ${o.seat_limit}` : ""}</td>
                  <td className="px-4 py-3">{pct}%</td>
                  <td className={`px-4 py-3 ${a.late ? "text-error" : "text-muted"}`}>{a.late}</td>
                  <td className="px-4 py-3 text-muted">{a.lastActive ? fmtDate(a.lastActive) : "Never"}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={openClient}>
                      <input type="hidden" name="id" value={o.id} />
                      <button className="btn btn-ghost btn-sm">View as manager</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NewClient packs={packs.data ?? []} />
    </>
  );
}
