import Link from "next/link";
import { canManageTeam, requireStaff } from "@/lib/staff";
import { rulesFor } from "@/lib/state-rules";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { locationZones } from "@/lib/team-time";
import { loadTeam } from "../../../data";
import { PageHead } from "../../../ui";
import { AssignToLocation, PlaceForm } from "./forms";

/** Each location's state, and the state or city courses it needs. */
export default async function StateRules() {
  const s = await requireStaff();
  const admin = canManageTeam(s);
  const team = await loadTeam(s.org.id, s.locationIds);
  const { data: locs } = await supabaseAdmin()
    .from("locations")
    .select("id, name, state, city")
    .eq("org_id", s.org.id)
    .order("name");
  const { picked } = await locationZones(s.org.id);
  const locations = (locs ?? []).filter((l) => !s.locationIds || s.locationIds.includes(l.id));
  const { data: courses } = await supabaseAdmin().from("courses").select("id, slug, title").eq("is_published", true);
  const bySlug = new Map((courses ?? []).map((c) => [c.slug, c]));

  // A location "has" a course if it's assigned to everyone or to that location.
  const covered = (courseId: string, locationId: string) =>
    team.rawAssignments.some(
      (a) => a.course_id === courseId && !a.learner_id && !a.job_role_id && (!a.location_id || a.location_id === locationId),
    );

  return (
    <>
      <p className="mb-2"><Link href="/admin/settings" className="label">← Team settings</Link></p>
      <PageHead eyebrow="✦ Team settings" title={<>State <em>rules</em></>} />
      <p className="mb-6 max-w-2xl text-muted">
        Tell us which state each location is in, and we&apos;ll show the state and city training laws our courses cover there. The state also sets the location&apos;s time zone for reports and reminder emails (pick another if needed).
        This is guidance, not legal advice. Supervisor and industry courses (like Illinois restaurants) only fit some people, so
        assign those by role.
      </p>
      {locations.length === 0 && (
        <p className="card p-6 text-muted">
          No locations yet. Add them in <Link href="/admin/settings">Team settings</Link> first.
        </p>
      )}
      <div className="grid gap-6">
        {locations.map((l) => {
          const rules = rulesFor(l.state, l.city);
          return (
            <section key={l.id} className="card p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-3xl">{l.name}</h2>
                <PlaceForm id={l.id} state={l.state} city={l.city} timeZone={picked[l.id] ?? null} disabled={!admin} />
              </div>
              {!l.state ? (
                <p className="mt-4 text-sm text-muted">Pick a state to see what applies.</p>
              ) : rules.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No state-specific courses in our library for {l.state} yet. Federal OSHA training still applies.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {rules.map((r) => {
                    const c = bySlug.get(r.slug);
                    if (!c) return null;
                    const has = covered(c.id, l.id);
                    return (
                      <li key={r.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <span>
                          <span className="font-medium">{c.title}</span>
                          <span className="block text-sm text-muted">{r.note}</span>
                        </span>
                        {has ? (
                          <span className="chip border-success/40 bg-success/10 text-success">Assigned</span>
                        ) : (
                          <AssignToLocation courseId={c.id} locationId={l.id} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
