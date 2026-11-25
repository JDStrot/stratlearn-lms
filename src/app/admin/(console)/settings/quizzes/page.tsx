import Link from "next/link";
import { canManageTeam, requireStaff } from "@/lib/staff";
import { loadOrgSettings } from "@/lib/org-settings";
import { PageHead } from "../../../ui";
import { CertificateForm, QuizForm } from "../client-forms";

export default async function Quizzes() {
  const s = await requireStaff();
  const admin = canManageTeam(s);
  const settings = await loadOrgSettings(s.org.id);
  const logoUrl = settings.certificate.logo_path ? `/api/org-logo/${s.org.id}?v=${encodeURIComponent(settings.certificate.logo_path)}` : null;

  return (
    <>
      <p className="mb-2"><Link href="/admin/settings" className="label">← Team settings</Link></p>
      <PageHead eyebrow="✦ Team settings" title={<>Quizzes &amp; <em>certificates</em></>} />
      {!admin && <p className="mb-6 text-muted">Only owners and admins can change these settings.</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-1 text-3xl">Passing <em>score</em></h2>
          <p className="mb-4 text-sm text-muted">
            If someone scores below this, the course asks them to try again. After the last try, it waits for a manager to give
            more tries on their page.
          </p>
          <QuizForm v={settings.quiz} disabled={!admin} />
        </section>
        <section className="card p-6">
          <h2 className="mb-1 text-3xl">Certificate <em>branding</em></h2>
          <p className="mb-4 text-sm text-muted">Your logo and signer appear on every certificate your team earns.</p>
          <CertificateForm v={settings.certificate} logoUrl={logoUrl} disabled={!admin} />
        </section>
      </div>
    </>
  );
}
