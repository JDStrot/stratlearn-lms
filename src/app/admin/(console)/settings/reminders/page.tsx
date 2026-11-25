import Link from "next/link";
import { canManageTeam, requireStaff } from "@/lib/staff";
import { loadOrgSettings } from "@/lib/org-settings";
import { emailReady } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fmtDate } from "../../../data";
import { PageHead } from "../../../ui";
import { NotifyForm, RecordsForm } from "../client-forms";

export default async function Reminders() {
  const s = await requireStaff();
  const admin = canManageTeam(s);
  const settings = await loadOrgSettings(s.org.id);
  const { data: log } = await supabaseAdmin()
    .from("notification_log")
    .select("kind, sent_to, status, created_at")
    .eq("org_id", s.org.id)
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <>
      <p className="mb-2"><Link href="/admin/settings" className="label">← Team settings</Link></p>
      <PageHead eyebrow="✦ Team settings" title={<>Reminders &amp; <em>records</em></>} />
      {!admin && <p className="mb-6 text-muted">Only owners and admins can change these settings.</p>}
      {!emailReady() && (
        <p className="mb-6 rounded-[10px] border border-lilac bg-mist/60 px-4 py-3 text-sm">
          Email sending isn&apos;t switched on for the site yet, so reminders and reports are saved here but not sent. STRATLEARN
          is setting it up.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-1 text-3xl">Reminders</h2>
          <p className="mb-4 text-sm text-muted">
            Workers with an email get a friendly nudge in their language. Workers without email see it on their home screen.
            Checked once a day.
          </p>
          <NotifyForm v={settings.notify} disabled={!admin} />
        </section>
        <section className="card p-6">
          <h2 className="mb-1 text-3xl">Records &amp; <em>reports</em></h2>
          <p className="mb-4 text-sm text-muted">
            Records are never deleted automatically, even for people you turn off. Old course versions and certificates are kept
            too. A scheduled report emails the training status spreadsheet.
          </p>
          <RecordsForm v={settings.records} disabled={!admin} />
          {settings.records.last_export_at && (
            <p className="mt-3 text-sm text-muted">Last report sent {fmtDate(settings.records.last_export_at)}.</p>
          )}
        </section>
        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-3xl">Recently <em>sent</em></h2>
          <ul className="flex flex-col gap-1 text-sm">
            {(log ?? []).length === 0 && <li className="text-muted">Nothing yet.</li>}
            {(log ?? []).map((l, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-3">
                <span>{l.kind} · {l.sent_to}{l.status !== "sent" ? ` (${l.status.replace("_", " ")})` : ""}</span>
                <span className="text-muted">{fmtDate(l.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
