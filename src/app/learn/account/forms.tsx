"use client";

import { useActionState, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { saveEmailPassword, type AccountState } from "./actions";

export function EmailPasswordForm({ email, es }: { email: string; es: boolean }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveEmailPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="label text-plum">Email</span>
        <input name="email" type="email" defaultValue={email} autoComplete="email" className="field" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label text-plum">{es ? "Contraseña nueva" : "New password"}</span>
        <input name="password" type="password" minLength={8} autoComplete="new-password" className="field" required />
        <span className="text-sm text-muted">{es ? "Al menos 8 caracteres." : "At least 8 characters."}</span>
      </label>
      {state.error && <p role="alert" className="rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-[10px] border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.ok}</p>}
      <button disabled={pending} className="btn btn-primary btn-sm self-start">{es ? "Guardar" : "Save"}</button>
    </form>
  );
}

export function AddPasskey({ es }: { es: boolean }) {
  const [supported, setSupported] = useState(true);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setSupported(!!window.PublicKeyCredential), []);
  if (!supported) return <p className="text-sm text-muted">{es ? "Este navegador no lo permite." : "This browser doesn't support it."}</p>;

  async function add() {
    setBusy(true);
    setMsg({});
    try {
      const options = await fetch("/api/passkey/register").then((r) => r.json());
      if (options.error) throw new Error(options.error);
      const response = await startRegistration({ optionsJSON: options });
      const device = /iPhone/.test(navigator.userAgent) ? "iPhone" : /iPad/.test(navigator.userAgent) ? "iPad" : /Android/.test(navigator.userAgent) ? "Android phone" : /Mac/.test(navigator.userAgent) ? "Mac" : "This device";
      const res = await fetch("/api/passkey/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, device }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.reload();
    } catch (e) {
      const err = e as Error;
      setMsg({ error: /NotAllowed|cancel|abort/i.test(`${err.name} ${err.message}`) ? (es ? "Cancelado." : "Cancelled.") : err.message || "Try again." });
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={add} disabled={busy} className="btn btn-primary btn-sm self-start">
        {busy ? "..." : es ? "Activar en este teléfono" : "Turn on for this phone"}
      </button>
      {msg.error && <p role="alert" className="text-sm text-error">{msg.error}</p>}
    </div>
  );
}
