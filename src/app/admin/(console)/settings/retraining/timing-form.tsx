"use client";

import { useActionState } from "react";
import { saveTrainingTiming, type FormState } from "../../../actions";
import { Field, Notice } from "../../../ui";

type Settings = { default_due_days: number | null; grace_days: number; retrain_notice_days: number };

export function TimingForm({ settings, disabled }: { settings: Settings; disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTrainingTiming, {});
  return (
    <form action={action} className="grid gap-4">
      <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-3">
        <Field label="New training is due" hint="The starting choice on the Assign page">
          <select name="dueDays" defaultValue={settings.default_due_days == null ? "none" : String(settings.default_due_days)} className="field">
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>In {d} days</option>
            ))}
            {settings.default_due_days != null && ![7, 14, 30, 60, 90].includes(settings.default_due_days) && (
              <option value={settings.default_due_days}>In {settings.default_due_days} days</option>
            )}
            <option value="none">No due date</option>
          </select>
        </Field>
        <Field label="Grace days before overdue" hint="0 = overdue the day after it's due">
          <input type="number" name="graceDays" min={0} max={90} defaultValue={settings.grace_days} className="field" />
        </Field>
        <Field label="Show retraining early" hint="Days before the retrain date it comes back on their list">
          <input type="number" name="noticeDays" min={0} max={180} defaultValue={settings.retrain_notice_days} className="field" />
        </Field>
      </fieldset>
      <Notice state={state} />
      {!disabled && <button disabled={pending} className="btn btn-primary btn-sm self-start">{pending ? "Saving..." : "Save"}</button>}
    </form>
  );
}
