"use client";

import { useActionState, useState } from "react";
import { addPeople, type AddState } from "../../actions";
import { Field, Notice } from "../../ui";

/**
 * Add one worker, or paste a whole list. After saving, the new PINs show
 * once with a button to print welcome slips (PINs are never stored in a
 * readable form, so this is the moment to hand them out).
 */
export function AddPeople({
  open,
  roles,
  locations,
  defaultLanguage,
}: {
  open: boolean;
  roles: string[];
  locations: string[];
  defaultLanguage: "en" | "es";
}) {
  const [state, action, pending] = useActionState<AddState, FormData>(addPeople, {});
  const [mode, setMode] = useState<"one" | "list">("one");
  const [show, setShow] = useState(open);

  if (!show)
    return (
      <button onClick={() => setShow(true)} className="btn btn-primary">
        + Add people
      </button>
    );

  return (
    <section className="card p-6" aria-labelledby="add-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="add-title" className="text-3xl">Add <em>people</em></h2>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-mist p-1">
          {(["one", "list"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`label min-h-[40px] rounded-full px-4 ${mode === m ? "bg-plum text-white" : "text-plum"}`}
            >
              {m === "one" ? "One person" : "Paste a list"}
            </button>
          ))}
        </div>
      </div>

      <datalist id="role-list">{roles.map((r) => <option key={r} value={r} />)}</datalist>
      <datalist id="location-list">{locations.map((r) => <option key={r} value={r} />)}</datalist>

      <form action={action} className="flex flex-col gap-4">
        {mode === "one" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name"><input name="name" className="field" required autoComplete="off" /></Field>
            <Field label="Sign-in name" hint="Leave blank and we'll make one, like maria.lopez">
              <input name="username" className="field" autoCapitalize="none" autoComplete="off" />
            </Field>
            <Field label="Role" hint="Pick one or type a new one"><input name="role" list="role-list" className="field" /></Field>
            <Field label="Location"><input name="location" list="location-list" className="field" /></Field>
            <Field label="PIN" hint="Leave blank for a random 4-digit PIN">
              <input name="pin" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} className="field tracking-[0.3em]" />
            </Field>
            <Field label="Language">
              <select name="language" defaultValue={defaultLanguage} className="field">
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </Field>
            <Field label="Email (optional)" hint="Lets them sign in with email too"><input name="email" type="email" className="field" /></Field>
            <Field label="Mobile (optional)"><input name="phone" type="tel" className="field" /></Field>
            <Field label="Employee ID (optional)"><input name="employeeId" className="field" /></Field>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <Field label="One person per line" hint="Name, Role, Location. Role and location are optional. You can paste from a spreadsheet.">
              <textarea name="list" rows={8} required className="field font-mono !text-base" placeholder={"Maria Lopez, Front desk, Downtown\nJay Kim, Trainer\nSam Patel"} />
            </Field>
            <div className="flex flex-col gap-4">
              <Field label="Role for everyone" hint="Used when a line has no role"><input name="role" list="role-list" className="field" /></Field>
              <Field label="Location for everyone"><input name="location" list="location-list" className="field" /></Field>
              <Field label="Language">
                <select name="language" defaultValue={defaultLanguage} className="field">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </Field>
            </div>
          </div>
        )}
        <Notice state={state} />
        <div className="flex flex-wrap gap-3">
          <button disabled={pending} className="btn btn-primary">{pending ? "Adding..." : "Add"}</button>
          <button type="button" onClick={() => setShow(false)} className="btn btn-ghost">Close</button>
        </div>
      </form>

      {state.created && state.created.length > 0 && (
        <div className="mt-6 rounded-[14px] border border-lilac bg-mist/40 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">Write these PINs down or print slips now. They won&apos;t show again.</p>
            <button type="button" onClick={() => printSlips(state.created!)} className="btn btn-primary btn-sm">
              Print welcome slips
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="label text-muted"><tr><th className="py-2">Name</th><th>Sign-in name</th><th>PIN</th></tr></thead>
            <tbody>
              {state.created.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="py-2">{c.name}</td>
                  <td>{c.username}</td>
                  <td className="font-mono text-base tracking-[0.2em]">{c.pin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Opens the badge sheet with the one-time PINs passed in the URL hash (never sent to the server). */
function printSlips(created: { id: string; pin: string }[]) {
  const ids = created.map((c) => c.id).join(",");
  const pins = created.map((c) => `${c.id}:${c.pin}`).join(",");
  window.open(`/admin/badges?ids=${ids}#pins=${pins}`, "_blank");
}
