"use client";

import { useActionState, useState } from "react";
import { staffEmailLink, staffSignIn, type FormState } from "../actions";
import { Notice } from "../ui";

export function StaffLoginForm() {
  const [way, setWay] = useState<"password" | "link">("password");
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(staffSignIn, {});
  const [lkState, lkAction, lkPending] = useActionState<FormState, FormData>(staffEmailLink, {});

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="How do you want to sign in?" className="grid grid-cols-2 gap-2 rounded-full bg-mist p-1.5">
        {(
          [
            ["password", "Password"],
            ["link", "Email me a link"],
          ] as const
        ).map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={way === id} onClick={() => setWay(id)}
            className={`label min-h-[44px] rounded-full transition ${way === id ? "bg-plum text-white shadow-soft" : "text-plum hover:bg-white/70"}`}>
            {text}
          </button>
        ))}
      </div>
      {way === "password" ? (
        <form action={pwAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Email</span>
            <input name="email" type="email" autoComplete="email" className="field" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Password</span>
            <input name="password" type="password" autoComplete="current-password" className="field" required />
          </label>
          <Notice state={pwState} />
          <button disabled={pwPending} className="btn btn-primary w-full">{pwPending ? "Signing in..." : "Sign in"}</button>
        </form>
      ) : (
        <form action={lkAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Email</span>
            <input name="email" type="email" autoComplete="email" className="field" required />
          </label>
          <Notice state={lkState} />
          <button disabled={lkPending} className="btn btn-primary w-full">{lkPending ? "Sending..." : "Send my link"}</button>
        </form>
      )}
    </div>
  );
}
