"use client";

import { useActionState } from "react";
import type { FormState } from "../../../actions";
import { saveTrainers } from "../../../trainer-actions";
import type { TrainerSettings } from "@/lib/trainer";
import { Field, Notice } from "../../../ui";

const ABOUT = {
  safety: {
    title: "Safety trainer",
    sub: "Answers questions in Bloodborne Pathogens, workplace violence, Hazard Communication, PPE and other OSHA courses. OSHA expects someone who knows the topic and how it applies at your workplace.",
    quals: "e.g. Safety Manager, 8 years; OSHA 30; knows our Exposure Control Plan",
  },
  hr: {
    title: "HR trainer",
    sub: "Answers questions in the state harassment courses (California, New York, Connecticut, Illinois). California says a trainer must answer within two business days.",
    quals: "e.g. HR Director; 10 years handling harassment complaints and investigations",
  },
} as const;

export function TrainersForm({ v, disabled }: { v: TrainerSettings; disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTrainers, {});
  return (
    <form action={action} className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {(["safety", "hr"] as const).map((topic) => {
          const t = v[topic];
          const a = ABOUT[topic];
          return (
            <section key={topic} className="card p-6">
              <h2 className="mb-1 text-3xl">{a.title}</h2>
              <p className="mb-4 text-sm text-muted">{a.sub}</p>
              <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-2">
                <Field label="Name"><input name={`${topic}.name`} defaultValue={t?.name ?? ""} className="field" maxLength={120} /></Field>
                <Field label="Title"><input name={`${topic}.title`} defaultValue={t?.title ?? ""} className="field" maxLength={120} placeholder="e.g. Safety Manager" /></Field>
                <Field label="Email" hint="Questions are sent here with a link to answer">
                  <input type="email" name={`${topic}.email`} defaultValue={t?.email ?? ""} className="field" maxLength={200} />
                </Field>
                <Field label="Phone (optional)" hint="Shown to workers who'd rather call">
                  <input name={`${topic}.phone`} defaultValue={t?.phone ?? ""} className="field" maxLength={40} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Qualifications" hint="Kept on every training record. Workers see it too">
                    <textarea name={`${topic}.qualifications`} defaultValue={t?.qualifications ?? ""} rows={2} maxLength={500} className="field" placeholder={a.quals} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="When they answer (optional)">
                    <input name={`${topic}.hours`} defaultValue={t?.hours ?? ""} className="field" maxLength={120} placeholder="e.g. Weekdays, 8 AM to 5 PM" />
                  </Field>
                </div>
              </fieldset>
            </section>
          );
        })}
      </div>
      <Notice state={state} />
      {!disabled && <button disabled={pending} className="btn btn-primary btn-sm self-start">{pending ? "Saving..." : "Save trainers"}</button>}
    </form>
  );
}
