"use client";

import { useActionState } from "react";
import { emailLearnerLink, resetPin, setLearnerPassword, updatePerson, type FormState, type PinState, type StaffState } from "../../../actions";
import type { Person } from "../../../data";
import { Field, Notice } from "../../../ui";

export function ResetPin({ id }: { id: string }) {
  const [state, action, pending] = useActionState<PinState, FormData>(resetPin, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="label text-plum">New PIN</span>
          <input name="pin" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} placeholder="Blank = random" className="field tracking-[0.3em]" />
        </label>
        <button disabled={pending} className="btn btn-primary btn-sm">Reset PIN</button>
      </div>
      {state.pin ? (
        <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3">
          {state.ok} New PIN: <b className="font-mono text-xl tracking-[0.3em] text-plum">{state.pin}</b>
          <span className="block text-sm text-muted">This also unlocks them. It won&apos;t show again.</span>
        </p>
      ) : (
        <Notice state={state} />
      )}
    </form>
  );
}

export function EditPerson({
  person: p,
  role,
  location,
  roles,
  locations,
}: {
  person: Person;
  role: string;
  location: string;
  roles: string[];
  locations: string[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePerson, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={p.id} />
      <datalist id="role-list">{roles.map((r) => <option key={r} value={r} />)}</datalist>
      <datalist id="location-list">{locations.map((r) => <option key={r} value={r} />)}</datalist>
      <Field label="Full name"><input name="name" defaultValue={p.display_name} className="field" required /></Field>
      <Field label="Sign-in name"><input name="username" defaultValue={p.username} className="field" autoCapitalize="none" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role"><input name="role" list="role-list" defaultValue={role} className="field" /></Field>
        <Field label="Location"><input name="location" list="location-list" defaultValue={location} className="field" /></Field>
      </div>
      <Field label="Email (optional)"><input name="email" type="email" defaultValue={p.email ?? ""} className="field" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mobile (optional)"><input name="phone" type="tel" defaultValue={p.phone ?? ""} className="field" /></Field>
        <Field label="Employee ID"><input name="employeeId" defaultValue={p.employee_id ?? ""} className="field" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Language">
          <select name="language" defaultValue={p.preferred_language} className="field">
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </Field>
        <Field label="Start date" hint="New-hire due dates count from here">
          <input name="startDate" type="date" defaultValue={p.start_date ?? ""} className="field" />
        </Field>
      </div>
      <Notice state={state} />
      <button disabled={pending} className="btn btn-primary btn-sm self-start">{pending ? "Saving..." : "Save"}</button>
    </form>
  );
}

export function EmailSignIn({ id, email }: { id: string; email: string | null }) {
  const [pw, pwAction, pwPending] = useActionState<StaffState, FormData>(setLearnerPassword, {});
  const [link, linkAction, linkPending] = useActionState<FormState, FormData>(emailLearnerLink, {});
  if (!email) return <p className="text-sm text-muted">Add an email under Details to let them sign in with email too.</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Email sign-in: <b className="text-plum">{email}</b></p>
      <form action={linkAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={id} />
        <button disabled={linkPending} className="btn btn-ghost btn-sm">Email them a sign-in link</button>
      </form>
      <Notice state={link} />
      <form action={pwAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="label text-plum">New password</span>
          <input name="password" type="text" minLength={8} placeholder="Blank = random" autoComplete="off" className="field" />
        </label>
        <button disabled={pwPending} className="btn btn-primary btn-sm">Reset password</button>
      </form>
      {pw.password ? (
        <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3">
          New password: <b className="font-mono text-plum">{pw.password}</b>
          <span className="block text-sm text-muted">Give it to them privately. They can change it under My sign-in.</span>
        </p>
      ) : (
        <Notice state={pw} />
      )}
    </div>
  );
}
