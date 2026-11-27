"use client";

import { useActionState } from "react";

type State = { error?: string; ok?: string };

/** Answer box for a worker's training question (console inbox and the trainer's email link). */
export function AnswerForm({
  action,
  hidden,
  defaultBy,
  askBy = false,
}: {
  action: (p: State, f: FormData) => Promise<State>;
  hidden: Record<string, string>;
  defaultBy?: string;
  askBy?: boolean;
}) {
  const [state, run, pending] = useActionState<State, FormData>(action, {});
  if (state.ok)
    return (
      <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
        {state.ok}
      </p>
    );
  return (
    <form action={run} className="grid gap-3">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className="flex flex-col gap-1.5">
        <span className="label text-plum">Your answer</span>
        <textarea name="answer" required rows={5} maxLength={4000} className="field" placeholder="Write it the way you'd say it out loud." />
      </label>
      {askBy && (
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Your name</span>
          <input name="by" required defaultValue={defaultBy} maxLength={120} className="field" />
        </label>
      )}
      {state.error && (
        <p role="alert" className="rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{state.error}</p>
      )}
      <button disabled={pending} className="btn btn-primary btn-sm self-start">{pending ? "Sending..." : "Send answer"}</button>
    </form>
  );
}
