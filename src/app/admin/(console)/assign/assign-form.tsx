"use client";

import { useActionState, useState } from "react";
import { assignTraining, type FormState } from "../../actions";
import { Field, Notice } from "../../ui";

type Named = { id: string; name: string };

export function AssignForm({
  defaultWho,
  courses,
  packs,
  roles,
  locations,
  people,
  defaultDueDays,
  limited = false,
}: {
  /** Manager limited to some locations: no "everyone" or role-wide choices. */
  limited?: boolean;
  defaultWho?: string;
  /** Team setting: days until due for new assignments (null = no due date). */
  defaultDueDays: number | null;
  courses: { id: string; title: string; minutes: number | null }[];
  packs: { id: string; title: string; paths: { path: string; count: number }[] }[];
  roles: Named[];
  locations: Named[];
  people: Named[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(assignTraining, {});
  const [kind, setKind] = useState<"pack" | "course">(packs.length ? "pack" : "course");
  const [packId, setPackId] = useState(packs[0]?.id ?? "");
  const presetDays = ["7", "14", "30", "60", "90"];
  const initialDue = defaultDueDays == null ? "none" : String(defaultDueDays);
  const [due, setDue] = useState(initialDue);
  const [repeat, setRepeat] = useState("");
  const pack = packs.find((p) => p.id === packId);

  return (
    <form action={action} className="card grid gap-6 p-6 lg:grid-cols-3">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-serif text-2xl text-plum">1. What</legend>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-mist p-1">
          {(["pack", "course"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
              className={`label min-h-[40px] rounded-full ${kind === k ? "bg-plum text-white" : "text-plum"}`}>
              {k === "pack" ? "A pack" : "One course"}
            </button>
          ))}
        </div>
        {kind === "pack" ? (
          packs.length === 0 ? (
            <p className="text-sm text-muted">No packs switched on for this team yet.</p>
          ) : (
            <>
              <Field label="Pack">
                <select className="field" value={packId} onChange={(e) => setPackId(e.target.value)}>
                  {packs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </Field>
              <Field label="Path" hint="Pick the path that matches the job, or the whole pack">
                <select name="what" className="field" key={packId}>
                  <option value={`pack:${packId}:*`}>Whole pack</option>
                  {pack?.paths.map((x) => (
                    <option key={x.path} value={`pack:${packId}:${x.path}`}>
                      {x.path.replace(/-/g, " ").replace(/\bhr\b/, "HR").replace(/^./, (c) => c.toUpperCase())} ({x.count} courses)
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )
        ) : (
          <Field label="Course">
            <select name="what" className="field">
              {courses.map((c) => (
                <option key={c.id} value={`course:${c.id}`}>{c.title}{c.minutes ? ` (${c.minutes} min)` : ""}</option>
              ))}
            </select>
          </Field>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-serif text-2xl text-plum">2. Who</legend>
        <Field label="Assign to" hint="New people who join a role or location get it too">
          <select name="who" defaultValue={defaultWho ?? (limited ? undefined : "all")} className="field">
            {!limited && <option value="all">Everyone on the team</option>}
            {!limited && roles.length > 0 && (
              <optgroup label="Everyone in a role">
                {roles.map((r) => <option key={r.id} value={`role:${r.id}`}>{r.name}</option>)}
              </optgroup>
            )}
            {locations.length > 0 && (
              <optgroup label="Everyone at a location">
                {locations.map((r) => <option key={r.id} value={`location:${r.id}`}>{r.name}</option>)}
              </optgroup>
            )}
            {people.length > 0 && (
              <optgroup label="One person">
                {people.map((r) => <option key={r.id} value={`person:${r.id}`}>{r.name}</option>)}
              </optgroup>
            )}
          </select>
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-serif text-2xl text-plum">3. When</legend>
        <Field label="Due" hint="For a role, location or the whole team, new hires get the same number of days from their start date">
          <select name="dueDays" value={due} onChange={(e) => setDue(e.target.value)} className="field">
            <option value="7">In 1 week</option>
            <option value="14">In 2 weeks</option>
            <option value="30">In 30 days</option>
            <option value="60">In 60 days</option>
            <option value="90">In 90 days</option>
            {!presetDays.includes(initialDue) && initialDue !== "none" && (
              <option value={initialDue}>In {initialDue} days</option>
            )}
            <option value="date">On a date...</option>
            <option value="none">No due date</option>
          </select>
        </Field>
        {due === "date" && (
          <Field label="Due date"><input type="date" name="dueDate" required className="field" /></Field>
        )}
        <Field label="Retraining" hint="The course rule follows the law, e.g. California harassment every 2 years">
          <select name={repeat === "custom" ? undefined : "repeat"} value={repeat} onChange={(e) => setRepeat(e.target.value)} className="field">
            <option value="">Use the course rule</option>
            <option value="never">Never, just once</option>
            <option value="12">Every year</option>
            <option value="24">Every 2 years</option>
            <option value="36">Every 3 years</option>
            <option value="custom">Every ... months</option>
          </select>
        </Field>
        {repeat === "custom" && (
          <Field label="Months between retraining">
            <input type="number" name="repeat" min={1} max={240} required className="field" />
          </Field>
        )}
        <label className="flex items-start gap-3 text-[0.95rem]">
          <input type="checkbox" name="retake" className="mt-1 size-4 accent-plum" />
          <span>
            Have them take it again
            <span className="block text-sm text-muted">Even if they finished it before. Old records and certificates stay on file.</span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-3 lg:col-span-3">
        <Notice state={state} />
        <button disabled={pending} className="btn btn-primary self-start">{pending ? "Assigning..." : "Assign"}</button>
      </div>
    </form>
  );
}
