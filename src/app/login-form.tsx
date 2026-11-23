"use client";

import { useActionState } from "react";
import { loginWithPin, type LoginState } from "./actions";

const field =
  "w-full rounded-2xl border-2 border-pink-100 bg-white px-4 py-3 text-lg outline-none focus:border-brand";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginWithPin, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-muted">Team code</span>
        <input name="joinCode" autoCapitalize="characters" autoComplete="organization" className={`${field} uppercase`} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-muted">Your name</span>
        <input name="username" autoCapitalize="none" autoComplete="username" className={field} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-muted">PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4,8}"
          maxLength={8}
          autoComplete="current-password"
          className={`${field} tracking-[0.5em]`}
          required
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-2xl bg-brand px-4 py-4 text-lg font-bold text-white shadow-[0_4px_0_var(--brand-dark)] transition active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Let's go"}
      </button>
    </form>
  );
}
