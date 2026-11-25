import Link from "next/link";
import { canManageTeam, requireStaff } from "@/lib/staff";
import { repeatLabel } from "@/lib/status";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveCourseRule } from "../../../actions";
import { loadTeam } from "../../../data";
import { RepeatPicker } from "../../../repeat-picker";
import { PageHead } from "../../../ui";
import { TimingForm } from "./timing-form";

/** Team settings: due dates, grace days, and how often each course repeats. */
export default async function Retraining({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const s = await requireStaff();
  const admin = canManageTeam(s);
  const team = await loadTeam(s.org.id, s.locationIds);
  const { data: info } = await supabaseAdmin()
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("title");
  type C = { id: string; title: string; default_recurrence_months?: number | null; recurrence_note?: string | null };
  const assigned = new Set(team.rawAssignments.map((a) => a.course_id));
  const courses = ((info ?? []) as C[]).filter((c) => all || assigned.has(c.id) || team.rules.teamRule.has(c.id));
  const toValue = (m: number | null | undefined) => (m ? String(m) : "never");

  return (
    <>
      <p className="mb-2"><Link href="/admin/settings" className="label">← Team settings</Link></p>
      <PageHead eyebrow="✦ Team settings" title={<>Due dates &amp; <em>retraining</em></>} />
      {!admin && <p className="mb-6 text-muted">Only owners and admins can change these settings.</p>}

      <section className="card mb-6 p-6">
        <h2 className="mb-1 text-3xl">Timing</h2>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          These apply to everything this team is assigned. A course only counts as overdue after its due date plus the
          grace days.
        </p>
        <TimingForm settings={team.rules.settings} disabled={!admin} />
      </section>

      <section className="card overflow-x-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6">
          <div>
            <h2 className="text-3xl">How often each course <em>repeats</em></h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Most courses are taken once. Courses the law says to redo come with a rule already set (for example,
              California harassment every 2 years). Change it here for your team only. A finish on any version of a course
              counts, and the clock starts from each person&apos;s last finish.
            </p>
          </div>
          <Link href={all ? "?" : "?all=1"} className="label">{all ? "Only courses we assigned" : "Show every course"}</Link>
        </div>
        <table className="mt-4 w-full min-w-[680px] text-left text-[0.95rem]">
          <thead className="label border-y border-line text-muted">
            <tr>
              <th className="px-6 py-3 font-semibold">Course</th>
              <th className="px-4 py-3 font-semibold">Course rule</th>
              <th className="px-4 py-3 font-semibold">Your team</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {courses.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-muted">Nothing assigned yet.</td></tr>
            )}
            {courses.map((c) => {
              const teamValue = team.rules.teamRule.has(c.id) ? toValue(team.rules.teamRule.get(c.id)) : "";
              return (
                <tr key={c.id}>
                  <td className="px-6 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3">
                    {repeatLabel(c.default_recurrence_months)}
                    {c.recurrence_note && <span className="block text-sm text-muted">{c.recurrence_note}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RepeatPicker
                      action={saveCourseRule}
                      hidden={{ courseId: c.id }}
                      value={teamValue}
                      inheritLabel={`Course rule (${repeatLabel(c.default_recurrence_months).toLowerCase()})`}
                      disabled={!admin}
                      label={`Retraining for ${c.title}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-6 py-4 text-sm text-muted">
          A manager can still pick a different repeat for one assignment on the Assign page. Changing a rule never removes
          anyone&apos;s records or certificates.
        </p>
      </section>
    </>
  );
}
