import { requireStaff } from "@/lib/staff";
import { removeAssignment } from "../../actions";
import { fmtDate, loadPacks, loadTeam, nameOf } from "../../data";
import { PageHead } from "../../ui";
import { repeatLabel } from "@/lib/status";
import { AssignForm } from "./assign-form";


export default async function AssignPage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const { who } = await searchParams;
  const s = await requireStaff();
  const [team, packs] = await Promise.all([loadTeam(s.org.id), loadPacks(s.org.id)]);
  const courseTitle = new Map(team.courses.map((c) => [c.id, c.title]));
  const packTitle = new Map(packs.map((p) => [p.id, p.title]));

  const whoLabel = (a: { learner_id: string | null; job_role_id: string | null; location_id: string | null }) => {
    if (a.learner_id) return team.people.find((p) => p.id === a.learner_id)?.display_name ?? "One person";
    const parts = [];
    if (a.job_role_id) parts.push(nameOf(team.roles, a.job_role_id));
    if (a.location_id) parts.push(nameOf(team.locations, a.location_id));
    return parts.length ? parts.join(" at ") : "Everyone";
  };

  // Group pack assignments so a 12-course pack shows as one line.
  type Group = { key: string; title: string; sub: string; who: string; due: string | null; repeat: string; ids: string[] };
  // Real clock per assignment (team and course rules filled in).
  const effective = new Map(team.assignments.map((a) => [a.id, a.recurrence_months]));
  const groups = new Map<string, Group>();
  for (const a of team.rawAssignments) {
    const target = `${a.learner_id}|${a.job_role_id}|${a.location_id}`;
    const key = a.pack_id ? `p|${a.pack_id}|${a.pack_path}|${target}|${a.due_at}|${a.recurrence_custom}|${a.recurrence_months}` : `c|${a.id}`;
    const g = groups.get(key);
    if (g) {
      g.ids.push(a.id);
      continue;
    }
    groups.set(key, {
      key,
      title: a.pack_id ? packTitle.get(a.pack_id) ?? "Pack" : courseTitle.get(a.course_id) ?? "Course",
      sub: a.pack_id ? (a.pack_path ? `${a.pack_path} path` : "whole pack") : "course",
      who: whoLabel(a),
      due: a.due_at,
      repeat:
        a.recurrence_custom === false
          ? a.pack_id
            ? "Course rules"
            : `${repeatLabel(effective.get(a.id))} (course rule)`
          : repeatLabel(a.recurrence_months),
      ids: [a.id],
    });
  }
  const list = [...groups.values()].sort((x, y) => x.who.localeCompare(y.who) || x.title.localeCompare(y.title));

  return (
    <>
      <PageHead eyebrow="✦ Assign training" title={<>Who takes <em>what</em></>} />
      <AssignForm
        defaultWho={who}
        courses={team.courses.map((c) => ({ id: c.id, title: c.title, minutes: c.minutes }))}
        packs={packs.map((p) => ({ id: p.id, title: p.title, paths: p.paths.map((x) => ({ path: x.path, count: x.courseIds.length })) }))}
        roles={team.roles}
        locations={team.locations}
        people={team.people.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.display_name }))}
        defaultDueDays={team.rules.settings.default_due_days}
      />

      <section className="card mt-8 overflow-x-auto">
        <h2 className="px-6 pt-6 text-3xl">Assigned <em>now</em></h2>
        <table className="mt-4 w-full min-w-[680px] text-left text-[0.95rem]">
          <thead className="label border-y border-line text-muted">
            <tr>
              <th className="px-6 py-3 font-semibold">Training</th>
              <th className="px-4 py-3 font-semibold">Who</th>
              <th className="px-4 py-3 font-semibold">Due</th>
              <th className="px-4 py-3 font-semibold">Retraining</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted">Nothing assigned yet.</td></tr>
            )}
            {list.map((g) => (
              <tr key={g.key}>
                <td className="px-6 py-3">
                  <span className="font-medium">{g.title}</span>
                  <span className="block text-sm text-muted">
                    {g.sub}{g.ids.length > 1 ? ` · ${g.ids.length} courses` : ""}
                  </span>
                </td>
                <td className="px-4 py-3">{g.who}</td>
                <td className="px-4 py-3">{g.due ? fmtDate(g.due) : <span className="text-muted">No date</span>}</td>
                <td className="px-4 py-3">{g.repeat}</td>
                <td className="px-4 py-3 text-right">
                  <form action={removeAssignment}>
                    <input type="hidden" name="ids" value={g.ids.join(",")} />
                    <button className="label text-error">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-6 py-4 text-sm text-muted">Removing an assignment keeps everyone&apos;s finished records and certificates.</p>
      </section>
    </>
  );
}
