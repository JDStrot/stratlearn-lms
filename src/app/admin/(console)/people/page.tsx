import Link from "next/link";
import { requireStaff } from "@/lib/staff";
import { fmtDate, loadTeam, nameOf, teamStatus } from "../../data";
import { PageHead } from "../../ui";
import { AddPeople } from "./add-people";

type Search = Promise<{ q?: string; role?: string; location?: string; show?: string; add?: string }>;

export default async function PeoplePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const s = await requireStaff();
  const team = await loadTeam(s.org.id);
  const status = new Map(teamStatus(team).map((r) => [r.person.id, r.statuses]));
  const q = (sp.q ?? "").toLowerCase();
  const people = team.people.filter(
    (p) =>
      (sp.show === "all" || p.is_active) &&
      (!sp.role || p.job_role_id === sp.role) &&
      (!sp.location || p.location_id === sp.location) &&
      (!q || `${p.display_name} ${p.username} ${p.email ?? ""} ${p.employee_id ?? ""}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHead eyebrow="✦ People" title={<>Your <em>team</em></>}>
        <Link href="/admin/badges" className="btn btn-ghost btn-sm">Print badges</Link>
      </PageHead>

      <AddPeople
        open={sp.add === "1" || team.people.length === 0}
        roles={team.roles.map((r) => r.name)}
        locations={team.locations.map((l) => l.name)}
        defaultLanguage={s.org.default_language}
      />

      <form className="mt-8 flex flex-wrap items-end gap-3" role="search">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="label text-plum">Search</span>
          <input name="q" defaultValue={sp.q} placeholder="Name, sign-in name, email or ID" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Role</span>
          <select name="role" defaultValue={sp.role ?? ""} className="field">
            <option value="">All roles</option>
            {team.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Location</span>
          <select name="location" defaultValue={sp.location ?? ""} className="field">
            <option value="">All locations</option>
            {team.locations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="flex min-h-[52px] items-center gap-2">
          <input type="checkbox" name="show" value="all" defaultChecked={sp.show === "all"} className="size-5 accent-[var(--plum)]" />
          <span className="text-sm">Show turned-off people</span>
        </label>
        <button className="btn btn-primary btn-sm">Filter</button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[0.95rem]">
          <thead className="label border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Training</th>
              <th className="px-4 py-3 font-semibold">Last sign-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {people.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No one matches. Add people above.</td></tr>
            )}
            {people.map((p) => {
              const st = status.get(p.id) ?? [];
              const done = st.filter((x) => x.status === "done").length;
              const late = st.filter((x) => x.status === "overdue" || x.status === "expired").length;
              const locked = p.locked_until && new Date(p.locked_until) > new Date();
              return (
                <tr key={p.id} className={p.is_active ? "" : "opacity-60"}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/people/${p.id}`} className="font-medium text-ink">{p.display_name}</Link>
                    <span className="block text-sm text-muted">
                      {p.username}
                      {!p.is_active && " · turned off"}
                      {locked && " · locked out"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{nameOf(team.roles, p.job_role_id)}</td>
                  <td className="px-4 py-3">{nameOf(team.locations, p.location_id)}</td>
                  <td className="px-4 py-3">
                    {st.length === 0 ? (
                      <span className="text-muted">Nothing assigned</span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{done} / {st.length} done</span>
                        {late > 0 && <span className="chip border-error/40 bg-error/10 text-error">{late} overdue</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.last_login_at ? fmtDate(p.last_login_at) : "Never"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">{people.length} shown</p>
    </>
  );
}
