"use client";

import { useActionState, useState } from "react";
import { loginWithPin, type LoginState } from "./actions";
import { comingSoonMethods } from "@/lib/login-methods";

type Way = "pin" | "qr";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginWithPin, {});
  const [way, setWay] = useState<Way>("pin");
  const soon = comingSoonMethods();

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="How do you want to sign in?" className="grid grid-cols-2 gap-2 rounded-full bg-mist p-1.5">
        {(
          [
            ["pin", "PIN"],
            ["qr", "QR badge"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={way === id}
            aria-controls={`way-${id}`}
            onClick={() => setWay(id)}
            className={`label min-h-[44px] rounded-full transition ${
              way === id ? "bg-plum text-white shadow-soft" : "text-plum hover:bg-white/70"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {way === "pin" ? (
        <form id="way-pin" role="tabpanel" action={action} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Team code</span>
            <input name="joinCode" autoCapitalize="characters" autoComplete="organization" className="field uppercase" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Your name</span>
            <input name="username" autoCapitalize="none" autoComplete="username" className="field" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">PIN</span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              maxLength={8}
              autoComplete="current-password"
              className="field tracking-[0.5em]"
              required
            />
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] bg-mist/60 px-4 py-3">
            <input type="checkbox" name="remember" defaultChecked className="mt-1 size-5 accent-[var(--plum)]" />
            <span className="text-[0.95rem]">
              <span className="font-medium text-ink">Keep me signed in on this phone</span>
              <span className="block text-sm text-muted">On a shared tablet? Uncheck this.</span>
            </span>
          </label>
          {state.error && (
            <p role="alert" className="rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? "Signing in..." : "Start learning"}
          </button>
        </form>
      ) : (
        <div id="way-qr" role="tabpanel" className="flex flex-col items-center gap-4 rounded-[14px] border border-line bg-paper px-5 py-7 text-center">
          <QrIcon />
          <h3 className="text-2xl">Point your camera at your badge</h3>
          <p className="max-w-xs text-muted">
            Open your phone&apos;s camera and aim it at the QR code on your badge. Tap the link that pops up and you&apos;re in.
          </p>
          <p className="text-sm text-muted">No badge yet? Ask your manager, or use your PIN.</p>
        </div>
      )}

      {soon.length > 0 && (
        <div className="border-t border-line pt-5">
          <p className="eyebrow mb-3 text-center">More ways coming soon</p>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Sign-in options coming soon">
            {soon.map((m) => (
              <li key={m.id} className="chip opacity-80">
                {m.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QrIcon() {
  return (
    <svg aria-hidden width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="1" y="1" width="62" height="62" rx="14" fill="var(--mist)" />
      <g fill="var(--plum)">
        <path d="M14 14h14v14H14zM36 14h14v14H36zM14 36h14v14H14z" opacity=".95" />
        <path d="M18 18h6v6h-6zM40 18h6v6h-6zM18 40h6v6h-6z" fill="var(--mist)" />
        <path d="M36 36h5v5h-5zM45 36h5v5h-5zM40.5 40.5h5v5h-5zM36 45h5v5h-5zM45 45h5v5h-5z" />
      </g>
    </svg>
  );
}
