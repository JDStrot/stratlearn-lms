"use client";

import { useActionState } from "react";
import { assignTraining, saveLocationPlace, type FormState } from "../../../actions";
import { US_STATES } from "@/lib/state-rules";

export function PlaceForm({ id, state, city, disabled }: { id: string; state: string | null; city: string | null; disabled: boolean }) {
  const [s, action, pending] = useActionState<FormState, FormData>(saveLocationPlace, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="label text-plum">State</span>
        <select name="state" defaultValue={state ?? ""} disabled={disabled} className="field !min-h-[40px] !py-1.5">
          <option value="">Pick...</option>
          {US_STATES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="label text-plum">City</span>
        <input name="city" defaultValue={city ?? ""} disabled={disabled} placeholder="e.g. New York" className="field !min-h-[40px] w-40 !py-1.5" />
      </label>
      {!disabled && <button disabled={pending} className="btn btn-ghost btn-sm">Save</button>}
      {s.error ? <span className="text-sm text-error">{s.error}</span> : s.ok ? <span className="text-sm text-success">✓</span> : null}
    </form>
  );
}

export function AssignToLocation({ courseId, locationId }: { courseId: string; locationId: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(assignTraining, {});
  if (s.ok) return <span className="chip border-success/40 bg-success/10 text-success">Assigned</span>;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="what" value={`course:${courseId}`} />
      <input type="hidden" name="who" value={`location:${locationId}`} />
      <input type="hidden" name="dueDays" value="30" />
      <input type="hidden" name="repeat" value="" />
      <button disabled={pending} className="btn btn-primary btn-sm">{pending ? "Assigning..." : "Assign to this location"}</button>
      {s.error && <span className="text-sm text-error">{s.error}</span>}
    </form>
  );
}
