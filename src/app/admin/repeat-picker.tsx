"use client";

import { useActionState, useRef, useState } from "react";
import type { FormState } from "./actions";

const PRESETS = ["never", "12", "24", "36"];

/**
 * A retraining dropdown that saves as soon as it changes:
 * never / yearly / every 2 / every 3 years / every N months,
 * plus "use the course rule" when `inheritLabel` is given.
 */
export function RepeatPicker({
  action,
  hidden,
  value,
  inheritLabel,
  disabled,
  label,
}: {
  action: (p: FormState, f: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  /** "" = inherit, "never", or months as a string. */
  value: string;
  inheritLabel?: string;
  disabled?: boolean;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const custom = value !== "" && !PRESETS.includes(value);
  const [choice, setChoice] = useState(custom ? "custom" : value);
  const submit = () => setTimeout(() => ref.current?.requestSubmit(), 0);

  return (
    <form ref={ref} action={formAction} className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <select
        aria-label={label}
        disabled={disabled || pending}
        name={choice === "custom" ? undefined : "repeat"}
        value={choice}
        onChange={(e) => {
          setChoice(e.target.value);
          if (e.target.value !== "custom") submit();
        }}
        className="field !min-h-[40px] !py-1.5 text-[0.9rem]"
      >
        {inheritLabel !== undefined && <option value="">{inheritLabel}</option>}
        <option value="never">Never</option>
        <option value="12">Every year</option>
        <option value="24">Every 2 years</option>
        <option value="36">Every 3 years</option>
        <option value="custom">Every ... months</option>
      </select>
      {choice === "custom" && (
        <>
          <input
            type="number"
            name="repeat"
            min={1}
            max={240}
            defaultValue={custom ? value : ""}
            aria-label="Months"
            required
            disabled={disabled || pending}
            className="field !min-h-[40px] w-24 !py-1.5"
          />
          <button disabled={disabled || pending} className="btn btn-ghost btn-sm">Save</button>
        </>
      )}
      {pending ? (
        <span className="text-sm text-muted">Saving...</span>
      ) : state.error ? (
        <span role="alert" className="text-sm text-error">{state.error}</span>
      ) : state.ok ? (
        <span role="status" className="text-sm text-success">✓</span>
      ) : null}
    </form>
  );
}
