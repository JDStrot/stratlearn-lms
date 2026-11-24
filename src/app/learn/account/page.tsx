import Link from "next/link";
import { requireLearner } from "@/lib/learner";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { logout } from "../../actions";
import { removePasskey, setLanguage } from "./actions";
import { AddPasskey, EmailPasswordForm } from "./forms";

/** "My sign-in": add email + password, Face ID, and pick a language. */
export default async function Account() {
  const learner = await requireLearner();
  const session = await readSession();
  const es = learner.preferred_language === "es";
  const db = supabaseAdmin();
  const [{ data: me }, { data: keys }] = await Promise.all([
    db.from("learners").select("email, username, organizations(join_code)").eq("id", learner.id).single(),
    db.from("learner_passkeys").select("id, device_name, created_at").eq("learner_id", learner.id).order("created_at"),
  ]);
  const joinCode = (me?.organizations as unknown as { join_code: string } | null)?.join_code;
  const kiosk = !!session?.kiosk;

  return (
    <>
      <SiteHeader
        signOut={
          <form action={logout}>
            <button className="btn btn-ghost btn-sm">{es ? "Salir" : "Sign out"}</button>
          </form>
        }
      />
      <main id="main" className="flex-1 bg-paper">
        <div className="wrap flex max-w-3xl flex-col gap-6 py-12">
          <p><Link href="/learn" className="label">← {es ? "Mis cursos" : "My courses"}</Link></p>
          <div>
            <p className="eyebrow">✦ {es ? "Mi acceso" : "My sign-in"}</p>
            <h1 className="mt-2 text-5xl">{es ? <>Entra a <em>tu</em> manera</> : <>Sign in <em>your</em> way</>}</h1>
          </div>

          <section className="card p-6">
            <h2 className="mb-2 text-3xl">{es ? "Tu PIN" : "Your PIN"}</h2>
            <p className="text-muted">
              {es ? "Código de equipo" : "Team code"} <b className="text-plum">{joinCode}</b> · {es ? "nombre" : "name"}{" "}
              <b className="text-plum">{me?.username}</b>.{" "}
              {es ? "¿Olvidaste tu PIN? Pídele a tu gerente uno nuevo." : "Forgot your PIN? Your manager can give you a new one."}
            </p>
          </section>

          {kiosk ? (
            <p className="card bg-mist p-6 text-muted">
              {es ? "Esta es una tableta compartida. Configura tu acceso en tu propio teléfono." : "This is a shared tablet. Set up Face ID or email on your own phone."}
            </p>
          ) : (
            <>
              <section className="card p-6">
                <h2 className="mb-1 text-3xl">Face ID {es ? "o huella" : "or fingerprint"}</h2>
                <p className="mb-4 text-muted">
                  {es ? "Entra con un toque en este teléfono, sin PIN." : "Sign in on this phone with one touch, no PIN."}
                </p>
                {(keys ?? []).length > 0 && (
                  <ul className="mb-4 divide-y divide-line">
                    {(keys ?? []).map((k) => (
                      <li key={k.id} className="flex items-center justify-between gap-3 py-2">
                        <span>{k.device_name || (es ? "Este dispositivo" : "A device")}</span>
                        <form action={removePasskey}>
                          <input type="hidden" name="id" value={k.id} />
                          <button className="label text-error">{es ? "Quitar" : "Remove"}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <AddPasskey es={es} />
              </section>

              <section className="card p-6">
                <h2 className="mb-1 text-3xl">{es ? "Correo y contraseña" : "Email + password"}</h2>
                <p className="mb-4 text-muted">
                  {es ? "Opcional. Para entrar con tu correo en cualquier dispositivo." : "Optional. Sign in with your email on any device."}
                </p>
                <EmailPasswordForm email={me?.email ?? ""} es={es} />
              </section>
            </>
          )}

          <section className="card p-6">
            <h2 className="mb-4 text-3xl">{es ? "Idioma" : "Language"}</h2>
            <form action={setLanguage} className="flex gap-3">
              <button name="lang" value="en" className={`btn btn-sm ${es ? "btn-ghost" : "btn-primary"}`}>English</button>
              <button name="lang" value="es" className={`btn btn-sm ${es ? "btn-primary" : "btn-ghost"}`}>Español</button>
            </form>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
