"use client";

import { useActionState, useState } from "react";
import { createClientTeam, type OwnerState } from "../../owner-actions";
import { Field, Notice } from "../../ui";

export const PLAN_OPTIONS = [
  ["trial", "Trial"],
  ["essentials", "Essentials"],
  ["pro", "Pro"],
  ["small-team", "Small Team"],
  ["founding", "Founding"],
  ["custom", "Custom"],
] as const;

export function NewClient({ packs }: { packs: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<OwnerState, FormData>(createClientTeam, {});
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary mt-6">
        + New client
      </button>
    );
  return (
    <form action={action} className="card mt-6 grid gap-4 p-6 md:grid-cols-2">
      <h2 className="text-3xl md:col-span-2">New <em>client</em></h2>
      <Field label="Company name"><input name="name" required className="field" /></Field>
      <Field label="Team code" hint="What their workers type. 4 to 16 letters or numbers."><input name="joinCode" required className="field uppercase" /></Field>
      <Field label="Plan">
        <select name="plan" className="field">{PLAN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </Field>
      <Field label="Seat limit" hint="Blank = no limit"><input name="seats" inputMode="numeric" className="field" /></Field>
      <Field label="Their main manager's email" hint="Optional. Gets owner access to their team."><input name="managerEmail" type="email" className="field" /></Field>
      <Field label="Manager's name"><input name="managerName" className="field" /></Field>
      <fieldset className="md:col-span-2">
        <legend className="label mb-2 text-plum">Packs they get</legend>
        <div className="flex flex-wrap gap-2">
          {packs.map((p) => (
            <label key={p.id} className="chip cursor-pointer gap-2 !text-[0.8rem]">
              <input type="checkbox" name="packs" value={p.id} className="accent-[var(--plum)]" /> {p.title}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Notes (only you see these)"><textarea name="notes" rows={2} className="field" /></Field>
      <div className="flex flex-col gap-3 md:col-span-2">
        {state.password ? (
          <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3">
            {state.ok} Their first password: <b className="font-mono text-plum">{state.password}</b>. Send it privately; they sign in at /admin/login.
          </p>
        ) : (
          <Notice state={state} />
        )}
        <button disabled={pending} className="btn btn-primary self-start">{pending ? "Setting up..." : "Create client"}</button>
      </div>
    </form>
  );
}
