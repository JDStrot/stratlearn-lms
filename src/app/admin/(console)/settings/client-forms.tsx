"use client";

import { useActionState } from "react";
import type { FormState } from "../../actions";
import { saveCertificate, saveNotify, saveQuiz, saveRecords, uploadDocument } from "../../settings-actions";
import type { CertificateSettings, NotifySettings, QuizSettings, RecordsSettings } from "@/lib/org-settings";
import { Field, Notice } from "../../ui";

function useForm(fn: (p: FormState, f: FormData) => Promise<FormState>) {
  return useActionState<FormState, FormData>(fn, {});
}

const Save = ({ pending, disabled }: { pending: boolean; disabled: boolean }) =>
  disabled ? null : <button disabled={pending} className="btn btn-primary btn-sm self-start">{pending ? "Saving..." : "Save"}</button>;

export function NotifyForm({ v, disabled }: { v: NotifySettings; disabled: boolean }) {
  const [state, action, pending] = useForm(saveNotify);
  return (
    <form action={action} className="grid gap-4">
      <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2">
        <Field label="First reminder" hint="Days before it's due. 0 = no reminders before the due date">
          <input type="number" name="remindBefore" min={0} max={60} defaultValue={v.remind_before_days} className="field" />
        </Field>
        <Field label="Repeat reminders every" hint="Days, while it's still not done. 0 = just once">
          <input type="number" name="remindEvery" min={0} max={60} defaultValue={v.remind_every_days} className="field" />
        </Field>
        <Field label="Tell a manager after" hint="Days overdue. 0 = never">
          <input type="number" name="escalateAfter" min={0} max={90} defaultValue={v.escalate_after_days} className="field" />
        </Field>
        <Field label="Who hears about it" hint="Limited managers only hear about their own locations">
          <select name="escalateTo" defaultValue={v.escalate_to} className="field">
            <option value="managers">Managers, admins and owners</option>
            <option value="owners">Owners and admins only</option>
          </select>
        </Field>
      </fieldset>
      <Notice state={state} />
      <Save pending={pending} disabled={disabled} />
    </form>
  );
}

export function RecordsForm({ v, disabled }: { v: RecordsSettings; disabled: boolean }) {
  const [state, action, pending] = useForm(saveRecords);
  return (
    <form action={action} className="grid gap-4">
      <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2">
        <Field label="Keep training records for" hint="OSHA asks for 3 years on some topics; many lawyers suggest 5 or more">
          <select name="retention" defaultValue={v.retention_years == null ? "forever" : String(v.retention_years)} className="field">
            {[3, 5, 7, 10].map((y) => <option key={y} value={y}>At least {y} years</option>)}
            <option value="forever">Forever</option>
          </select>
        </Field>
        <Field label="Email a training report">
          <select name="frequency" defaultValue={v.export_frequency} className="field">
            <option value="off">Off</option>
            <option value="weekly">Every Monday</option>
            <option value="monthly">The 1st of every month</option>
          </select>
        </Field>
        <Field label="Send it to" hint="Up to 10 emails, separated by commas">
          <input name="emails" defaultValue={v.export_emails.join(", ")} className="field md:col-span-2" />
        </Field>
      </fieldset>
      <Notice state={state} />
      <Save pending={pending} disabled={disabled} />
    </form>
  );
}

export function QuizForm({ v, disabled }: { v: QuizSettings; disabled: boolean }) {
  const [state, action, pending] = useForm(saveQuiz);
  return (
    <form action={action} className="grid gap-4">
      <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2">
        <Field label="Passing score (%)" hint="Empty = each course's own rule. Scores count first-try answers">
          <input type="number" name="passScore" min={1} max={100} defaultValue={v.pass_score ?? ""} placeholder="Course rule" className="field" />
        </Field>
        <Field label="Tries before a manager steps in" hint="Empty = unlimited tries">
          <input type="number" name="maxAttempts" min={1} max={20} defaultValue={v.max_attempts ?? ""} placeholder="Unlimited" className="field" />
        </Field>
      </fieldset>
      <Notice state={state} />
      <Save pending={pending} disabled={disabled} />
    </form>
  );
}

export function CertificateForm({ v, logoUrl, disabled }: { v: CertificateSettings; logoUrl: string | null; disabled: boolean }) {
  const [state, action, pending] = useForm(saveCertificate);
  return (
    <form action={action} className="grid gap-4">
      <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2">
        <Field label="Signed by (name)"><input name="signerName" defaultValue={v.signer_name ?? ""} className="field" placeholder="e.g. Dana Ruiz" /></Field>
        <Field label="Their title"><input name="signerTitle" defaultValue={v.signer_title ?? ""} className="field" placeholder="e.g. Safety Director" /></Field>
        <Field label="Company logo" hint="PNG, JPG or WebP, under 1 MB">
          <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="field" />
        </Field>
        {logoUrl && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Current logo" className="h-14 max-w-[180px] object-contain" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeLogo" className="accent-plum" /> Remove logo</label>
          </div>
        )}
      </fieldset>
      <Notice state={state} />
      <Save pending={pending} disabled={disabled} />
    </form>
  );
}

export function UploadDocument({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useForm(uploadDocument);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="Title"><input name="title" required className="field" placeholder="Exposure Control Plan" /></Field>
      <Field label="File" hint="PDF, Word or image, under 10 MB"><input type="file" name="file" required className="field" /></Field>
      <Field label="Show with this course (optional)">
        <select name="courseId" className="field">
          <option value="">No course: team library only</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-3 self-end pb-3 text-[0.95rem]">
        <input type="checkbox" name="visible" defaultChecked className="size-4 accent-plum" /> Workers can see it
      </label>
      <div className="flex flex-col gap-3 md:col-span-2">
        <Notice state={state} />
        <button disabled={pending} className="btn btn-primary btn-sm self-start">{pending ? "Uploading..." : "Upload"}</button>
      </div>
    </form>
  );
}
