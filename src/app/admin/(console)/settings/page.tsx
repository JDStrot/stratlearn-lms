import Link from "next/link";
import { canManageTeam, requireStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { removeGroup, removeStaff, startTablet } from "../../actions";
import { PageHead } from "../../ui";
import { AddGroup, AddStaff, LoginOptions, StaffScope, TeamForm } from "./forms";

export default async function Settings() {
  const s = await requireStaff();
  const admin = canManageTeam(s);
  const db = supabaseAdmin();
  const [{ data: roles }, { data: locations }, { data: staff }] = await Promise.all([
    db.from("job_roles").select("id, name").eq("org_id", s.org.id).order("name"),
    db.from("locations").select("id, name").eq("org_id", s.org.id).order("name"),
    db.from("staff_members").select("user_id, role, display_name, location_ids").eq("org_id", s.org.id),
  ]);
  const { data: users } = admin ? await db.auth.admin.listUsers({ page: 1, perPage: 1000 }) : { data: null };
  const email = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <>
      <PageHead eyebrow="✦ Team settings" title={<>{s.org.name}</>} />
      {!admin && <p className="mb-6 text-muted">Only owners and admins can change these settings.</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-3xl">Team</h2>
          <TeamForm org={s.org} disabled={!admin} />
        </section>

        <section className="card p-6">
          <h2 className="mb-1 text-3xl">Sign-in <em>options</em></h2>
          <p className="mb-4 text-sm text-muted">Workers pick whichever way is easiest. Turn off anything your team won&apos;t use.</p>
          <LoginOptions settings={s.org.login_settings} disabled={!admin} />
          {s.org.login_settings.tablet && (
            <form action={startTablet} className="mt-5 rounded-[12px] bg-mist/60 p-4">
              <p className="mb-3 text-sm">
                <b className="text-plum">Setting up a break-room tablet?</b> Open this page on the tablet and tap below. It
                signs you out and shows your team&apos;s names with a PIN pad. People are signed out when they tap I&apos;m done
                or after 5 quiet minutes.
              </p>
              <button className="btn btn-primary btn-sm">Make this device the team tablet</button>
            </form>
          )}
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-3xl">Training <em>rules</em></h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["/admin/settings/retraining", "Due dates & retraining", "Default due days, grace days, which courses repeat every year or two."],
              ["/admin/settings/states", "State rules", "Which state each location is in, and the state laws it needs."],
              ["/admin/settings/reminders", "Reminders & records", "Nudges, telling managers about overdue training, record keeping, scheduled reports."],
              ["/admin/settings/quizzes", "Quizzes & certificates", "Passing score, number of tries, your logo and signer on certificates."],
              ["/admin/settings/documents", "Policies & plans", "Upload your own plans, like the Exposure Control Plan, for workers to read."],
            ].map(([href, title, sub]) => (
              <Link key={href} href={href} className="card card-hover flex flex-col gap-1 p-4 no-underline">
                <span className="font-medium text-ink">{title}</span>
                <span className="text-sm text-muted">{sub}</span>
              </Link>
            ))}
          </div>
        </section>

        {(["role", "location"] as const).map((kind) => {
          const list = (kind === "role" ? roles : locations) ?? [];
          return (
            <section key={kind} className="card p-6">
              <h2 className="mb-1 text-3xl">{kind === "role" ? "Job roles" : "Locations"}</h2>
              <p className="mb-4 text-sm text-muted">
                {kind === "role" ? "Assign training by role: everyone in it gets it, including new hires." : "Sites, stores or clubs. Assign training to a whole location."}
              </p>
              <ul className="mb-4 flex flex-wrap gap-2">
                {list.length === 0 && <li className="text-sm text-muted">None yet.</li>}
                {list.map((g) => (
                  <li key={g.id} className="chip gap-2 !text-[0.8rem]">
                    {g.name}
                    {admin && (
                      <form action={removeGroup} className="inline">
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="id" value={g.id} />
                        <button aria-label={`Remove ${g.name}`} className="text-muted hover:text-error">×</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              <AddGroup kind={kind} />
            </section>
          );
        })}

        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-1 text-3xl">Managers</h2>
          <p className="mb-4 text-sm text-muted">
            Managers add people, assign training and run reports. Admins can also change these settings.
          </p>
          <ul className="mb-5 divide-y divide-line">
            {(staff ?? []).map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-medium">{m.display_name || email.get(m.user_id) || "Manager"}</span>
                  <span className="block text-sm text-muted">{email.get(m.user_id)}</span>
                  {admin && m.role === "manager" && (locations ?? []).length > 0 && (
                    <StaffScope userId={m.user_id} locations={locations ?? []} on={(m.location_ids as string[] | null) ?? []} />
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="chip">{m.role}</span>
                  {admin && m.user_id !== s.userId && (m.role !== "owner" || s.role === "owner") && (
                    <form action={removeStaff}>
                      <input type="hidden" name="userId" value={m.user_id} />
                      <button className="label text-error">Remove</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {admin && <AddStaff locations={locations ?? []} />}
        </section>
      </div>
    </>
  );
}
