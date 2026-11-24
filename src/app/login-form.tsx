"use client";

import { useActionState, useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  loginWithEmail,
  loginWithPin,
  loginWithProvider,
  sendLoginLink,
  sendTextCode,
  verifyTextCode,
  type LoginState,
} from "./actions";

type Way = "pin" | "qr" | "email" | "text";
type Flags = { google: boolean; apple: boolean; sms: boolean };

const ERRORS: Record<string, string> = {
  link: "That sign-in link expired or was already used. Send a new one.",
  nomatch: "We couldn't find you on a team. Ask your manager to add your email, or use your PIN.",
  off: "Your team doesn't use that way to sign in. Try your PIN or QR badge.",
  paused: "Your team's training account is paused. Please talk to your manager.",
  provider: "That sign-in option isn't ready yet. Use your PIN or email.",
};

export function LoginForm({ flags, error }: { flags: Flags; error?: string }) {
  const [way, setWay] = useState<Way>("pin");
  const tabs: [Way, string][] = [
    ["pin", "PIN"],
    ["qr", "QR badge"],
    ["email", "Email"],
  ];
  if (flags.sms) tabs.push(["text", "Text"]);

  return (
    <div className="flex flex-col gap-6">
      {error && ERRORS[error] && (
        <p role="alert" className="rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {ERRORS[error]}
        </p>
      )}
      <div
        role="tablist"
        aria-label="How do you want to sign in?"
        className={`grid gap-1.5 rounded-full bg-mist p-1.5 ${tabs.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}
      >
        {tabs.map(([id, text]) => (
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

      {way === "pin" && <PinForm />}
      {way === "qr" && <QrHelp />}
      {way === "email" && <EmailForm />}
      {way === "text" && <TextForm />}

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <p className="eyebrow text-center">Or one tap</p>
        <PasskeyButton />
        {(flags.google || flags.apple) && (
          <form action={loginWithProvider} className="grid gap-3 sm:grid-cols-2">
            {flags.google && (
              <button name="provider" value="google" className="btn btn-ghost w-full normal-case tracking-normal">
                <GoogleIcon /> Google
              </button>
            )}
            {flags.apple && (
              <button name="provider" value="apple" className="btn btn-ghost w-full normal-case tracking-normal">
                <AppleIcon /> Apple
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Remember() {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] bg-mist/60 px-4 py-3">
      <input type="checkbox" name="remember" defaultChecked className="mt-1 size-5 accent-[var(--plum)]" />
      <span className="text-[0.95rem]">
        <span className="font-medium text-ink">Keep me signed in on this phone</span>
        <span className="block text-sm text-muted">On a shared tablet? Uncheck this.</span>
      </span>
    </label>
  );
}

function Msg({ state }: { state: LoginState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
        {state.ok}
      </p>
    );
  return null;
}

function PinForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginWithPin, {});
  return (
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
      <Remember />
      <Msg state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Signing in..." : "Start learning"}
      </button>
    </form>
  );
}

function QrHelp() {
  return (
    <div id="way-qr" role="tabpanel" className="flex flex-col items-center gap-4 rounded-[14px] border border-line bg-paper px-5 py-7 text-center">
      <QrIcon />
      <h3 className="text-2xl">Point your camera at your badge</h3>
      <p className="max-w-xs text-muted">
        Open your phone&apos;s camera and aim it at the QR code on your badge. Tap the link that pops up and you&apos;re in.
      </p>
      <p className="text-sm text-muted">No badge yet? Ask your manager, or use your PIN.</p>
    </div>
  );
}

function EmailForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginWithEmail, {});
  const [linkState, linkAction, linkPending] = useActionState<LoginState, FormData>(sendLoginLink, {});
  const [mode, setMode] = useState<"password" | "link">("password");
  return (
    <div id="way-email" role="tabpanel" className="flex flex-col gap-4">
      {mode === "password" ? (
        <form action={action} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Email</span>
            <input name="email" type="email" autoComplete="email" className="field" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Password</span>
            <input name="password" type="password" autoComplete="current-password" className="field" required />
          </label>
          <Remember />
          <Msg state={state} />
          <button disabled={pending} className="btn btn-primary w-full">{pending ? "Signing in..." : "Start learning"}</button>
          <button type="button" onClick={() => setMode("link")} className="label text-violet">
            No password? Email me a link instead
          </button>
        </form>
      ) : (
        <form action={linkAction} className="flex flex-col gap-4">
          <p className="text-muted">We&apos;ll email you a link. Tap it and you&apos;re in, no password needed.</p>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Email</span>
            <input name="email" type="email" autoComplete="email" className="field" required />
          </label>
          <Msg state={linkState} />
          <button disabled={linkPending} className="btn btn-primary w-full">{linkPending ? "Sending..." : "Email me a link"}</button>
          <button type="button" onClick={() => setMode("password")} className="label text-violet">
            Use my password instead
          </button>
        </form>
      )}
    </div>
  );
}

function TextForm() {
  const [sendState, sendAction, sending] = useActionState<LoginState, FormData>(sendTextCode, {});
  const [checkState, checkAction, checking] = useActionState<LoginState, FormData>(verifyTextCode, {});
  const [phone, setPhone] = useState("");
  const codeStep = sendState.step === "code";
  return (
    <div id="way-text" role="tabpanel" className="flex flex-col gap-4">
      <form action={sendAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">Mobile number</span>
          <input name="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" required />
        </label>
        {!codeStep && <Msg state={sendState} />}
        <button disabled={sending} className={`btn w-full ${codeStep ? "btn-ghost" : "btn-primary"}`}>
          {sending ? "Sending..." : codeStep ? "Send a new code" : "Text me a code"}
        </button>
      </form>
      {codeStep && (
        <form action={checkAction} className="flex flex-col gap-4">
          <input type="hidden" name="phone" value={phone} />
          <Msg state={checkState.error ? checkState : sendState} />
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">6-digit code</span>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field tracking-[0.5em]" required />
          </label>
          <button disabled={checking} className="btn btn-primary w-full">{checking ? "Checking..." : "Start learning"}</button>
        </form>
      )}
    </div>
  );
}

/** Face ID / fingerprint. Shows only on devices that support passkeys. */
function PasskeyButton() {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setOk(typeof window !== "undefined" && !!window.PublicKeyCredential);
  }, []);
  if (!ok) return null;

  async function go() {
    setBusy(true);
    setError("");
    try {
      const options = await fetch("/api/passkey/login").then((r) => r.json());
      const response = await startAuthentication({ optionsJSON: options });
      const res = await fetch("/api/passkey/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = "/learn";
    } catch (e) {
      const msg = (e as Error).message || "";
      setError(
        /NotAllowed|cancel|abort/i.test(`${(e as Error).name} ${msg}`)
          ? "No Face ID set up on this device yet. Sign in once with your PIN, then turn it on under My sign-in."
          : msg || "That didn't work. Use your PIN this time.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={go} disabled={busy} className="btn btn-ghost w-full normal-case tracking-normal">
        <FaceIcon /> {busy ? "Checking..." : "Face ID or fingerprint"}
      </button>
      {error && <p role="alert" className="text-center text-sm text-muted">{error}</p>}
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

function FaceIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M9 9v1M15 9v1M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.3.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
    </svg>
  );
}
