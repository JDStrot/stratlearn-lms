"use client";

import { useActionState } from "react";
import { setClientPacks, updateClientTeam, type OwnerState } from "../../../../owner-actions";
import { Field, Notice } from "../../../../ui";
import { PLAN_OPTIONS } from "../../new-client";

type Org = { id: string; name: string; plan: string; status: string; seat_limit: number | null; notes: string | null };

export function ClientForm({ org }: { org: Org }) {
  const [state, action, pending] = useActionState<OwnerState, FormData>(updateClientTeam, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={org.id} />
      <Field label="Name"><input name="name" defaultValue={org.name} className="field" required /></Field>
      <Field label="Plan">
        <select name="plan" defaultValue={org.plan} className="field">{PLAN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </Field>
      <Field label="Status" hint="Paused or closed teams can't sign in. Records are kept.">
        <select name="status" defaultValue={org.status} className="field">
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </Field>
      <Field label="Seat limit"><input name="seats" defaultValue={org.seat_limit ?? ""} inputMode="numeric" className="field" /></Field>
      <div className="sm:col-span-2"><Field label="Notes"><textarea name="notes" defaultValue={org.notes ?? ""} rows={3} className="field" /></Field></div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <Notice state={state} />
        <button disabled={pending} className="btn btn-primary btn-sm self-start">Save</button>
      </div>
    </form>
  );
}

export function ClientPacks({ id, packs, on }: { id: string; packs: { id: string; title: string }[]; on: string[] }) {
  const [state, action, pending] = useActionState<OwnerState, FormData>(setClientPacks, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col divide-y divide-line">
        {packs.map((p) => (
          <label key={p.id} className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3">
            <span>{p.title}</span>
            <input type="checkbox" name="packs" value={p.id} defaultChecked={on.includes(p.id)} className="toggle" />
          </label>
        ))}
      </div>
      <Notice state={state} />
      <button disabled={pending} className="btn btn-primary btn-sm self-start">Save packs</button>
    </form>
  );
}
