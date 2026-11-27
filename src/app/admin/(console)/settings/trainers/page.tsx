import Link from "next/link";
import { canManageTeam, requireStaff } from "@/lib/staff";
import { loadTrainers } from "@/lib/trainer";
import { PageHead } from "../../../ui";
import { TrainersForm } from "./form";

export default async function Trainers() {
  const s = await requireStaff();
  const admin = canManageTeam(s);
  const t = await loadTrainers(s.org.id);

  return (
    <>
      <p className="mb-2"><Link href="/admin/settings" className="label">← Team settings</Link></p>
      <PageHead eyebrow="✦ Team settings" title={<>Ask a <em>trainer</em></>} />
      <div className="mb-6 max-w-3xl space-y-2 text-muted">
        <p>
          Some training rules say workers must be able to ask a real person about the training. Courses that need it show an
          <b className="text-plum"> Ask a trainer</b> button. Questions go to the trainer by email and show up under
          <Link href="/admin/questions"> Questions</Link>, where any manager can answer too.
        </p>
        <p>
          If only one trainer is set, they get every question. If nobody is set, workers are told to ask their manager or HR, and
          managers get the questions instead. Trainers get a reminder after 1 business day; managers hear about it after 2.
        </p>
      </div>
      {!t.ready && (
        <p role="alert" className="mb-6 rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          This needs the Ask a trainer database update first.
        </p>
      )}
      {!admin && <p className="mb-6 text-muted">Only owners and admins can change these settings.</p>}
      <TrainersForm v={t} disabled={!admin || !t.ready} />
    </>
  );
}
