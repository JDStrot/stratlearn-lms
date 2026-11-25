"use client";

import { useActionState, useState } from "react";
import {
  addGroup,
  addStaff,
  saveLoginSettings,
  saveTeam,
  setStaffScope,
  type FormState,
  type StaffState,
} from "../../actions";
import type { LoginSettings, Org } from "@/lib/staff";
import { Field, Notice } from "../../ui";

export function TeamForm({ org, disabled }: { org: Org; disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTeam, {});
  return (
    <form action={action} className="grid gap-4">
      <fieldset disabled={disabled} className="grid gap-4">
        <Field label="Team name"><input name="name" defaultValue={org.name} className="field" required /></Field>
        <Field label="Team code" hint="Workers type this to sign in. Changing it doesn't affect QR badges.">
          <input name="joinCode" defaultValue={org.join_code} className="field uppercase" required />
        </Field>
        <Field label="Default language for new people">
          <select name="language" defaultValue={org.default_language} className="field">
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </Field>
      </fieldset>
      <Notice state={state} />
      {!disabled && <button disabled={pending} className="btn btn-primary btn-sm self-start">Save</button>}
    </form>
  );
}

const OPTIONS: { key: keyof LoginSettings; label: string; hint: string }[] = [
  { key: "pin", label: "Team code + PIN", hint: "No email needed. Best for most frontline teams." },
  { key: "qr", label: "QR badge", hint: "Scan the printed badge with a phone camera. No typing." },
  { key: "email_password", label: "Email + password", hint: "For people who'd rather use their email." },
  { key: "email_link", label: "Email me a link", hint: "No password to remember." },
  { key: "google", label: "Sign in with Google", hint: "One tap for people who use Gmail." },
  { key: "apple", label: "Sign in with Apple", hint: "One tap on iPhone." },
  { key: "passkey", label: "Face ID / fingerprint", hint: "After the first sign-in, unlock with their face or finger." },
  { key: "tablet", label: "Shared tablet mode", hint: "A break-room tablet: pick your name, type your PIN, auto sign-out." },
  { key: "sms", label: "Text me a code", hint: "Off by default. Texts cost money per message." },
];

export function LoginOptions({ settings, disabled }: { settings: LoginSettings; disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLoginSettings, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <fieldset disabled={disabled} className="flex flex-col divide-y divide-line">
        {OPTIONS.map((o) => (
          <label key={o.key} className="flex min-h-[52px] cursor-pointer items-center justify-between gap-4 py-2">
            <span>
              <span className="font-medium">{o.label}</span>
              <span className="block text-sm text-muted">{o.hint}</span>
            </span>
            <input type="checkbox" name={o.key} defaultChecked={settings[o.key]} className="toggle" />
          </label>
        ))}
      </fieldset>
      <Notice state={state} />
      {!disabled && <button disabled={pending} className="btn btn-primary btn-sm self-start">Save sign-in options</button>}
    </form>
  );
}

export function AddGroup({ kind }: { kind: "role" | "location" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addGroup, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2">
        <input name="name" aria-label={kind === "role" ? "New role" : "New location"} placeholder={kind === "role" ? "e.g. Front desk" : "e.g. Downtown"} className="field" />
        <button disabled={pending} className="btn btn-ghost btn-sm shrink-0">Add</button>
      </div>
      <Notice state={state} />
    </form>
  );
}

export function AddStaff({ locations = [] }: { locations?: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<StaffState, FormData>(addStaff, {});
  const [role, setRole] = useState("manager");
  return (
    <form action={action} className="grid gap-4 rounded-[14px] bg-mist/50 p-5 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
      <Field label="Their name"><input name="name" className="field" /></Field>
      <Field label="Their email"><input name="email" type="email" required className="field" /></Field>
      <Field label="Access">
        <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="field">
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <button disabled={pending} className="btn btn-primary btn-sm">Add manager</button>
      {role === "manager" && locations.length > 0 && (
        <fieldset className="md:col-span-4">
          <legend className="label mb-2 text-plum">Locations they manage</legend>
          <p className="mb-2 text-sm text-muted">Leave all unticked for the whole team.</p>
          <div className="flex flex-wrap gap-3">
            {locations.map((l) => (
              <label key={l.id} className="chip gap-2">
                <input type="checkbox" name="locations" value={l.id} className="accent-plum" /> {l.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="md:col-span-4">
        {state.password ? (
          <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3">
            {state.ok} Their first password is <b className="font-mono text-plum">{state.password}</b>. Send it to them privately. They sign in at
            /admin/login and can change it there.
          </p>
        ) : (
          <Notice state={state} />
        )}
      </div>
    </form>
  );
}

/** Which locations a manager can see (none ticked = whole team). */
export function StaffScope({ userId, locations, on }: { userId: string; locations: { id: string; name: string }[]; on: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setStaffScope, {});
  return (
    <details className="mt-2">
      <summary className="label cursor-pointer text-muted">{on.length ? `${on.length} location${on.length === 1 ? "" : "s"}` : "All locations"} · change</summary>
      <form action={action} className="mt-2 flex flex-wrap items-center gap-3">
        <input type="hidden" name="userId" value={userId} />
        {locations.map((l) => (
          <label key={l.id} className="chip gap-2">
            <input type="checkbox" name="locations" value={l.id} defaultChecked={on.includes(l.id)} className="accent-plum" /> {l.name}
          </label>
        ))}
        <button disabled={pending} className="btn btn-ghost btn-sm">Save</button>
        <Notice state={state} />
      </form>
    </details>
  );
}
