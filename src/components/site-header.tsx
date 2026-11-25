import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "./logo";
import { readSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { logout } from "@/app/actions";
import { staffSignOut } from "@/app/admin/actions";

type Who = { kind: "learner"; kiosk: boolean } | { kind: "staff" } | null;

/** Who is signed in on this browser: a learner (PIN, QR, email...), a manager, or nobody. */
async function whoIsSignedIn(): Promise<Who> {
  const learner = await readSession();
  if (learner) return { kind: "learner", kiosk: !!learner.kiosk };
  // Only ask Supabase when a manager sign-in cookie is present.
  const hasStaffCookie = (await cookies()).getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasStaffCookie || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const { data } = await (await supabaseServer()).auth.getUser();
    return data.user ? { kind: "staff" } : null;
  } catch {
    return null;
  }
}

const link = "inline-flex min-h-[44px] items-center rounded-full px-3 text-plum no-underline hover:text-violet";

/**
 * The LMS's own header: logo, a couple of learning links, and one button in
 * the same spot that says Sign in or Sign out depending on who is signed in.
 * `extra` adds a page-specific link (e.g. "My sign-in" on the learner home).
 */
export async function SiteHeader({ es = false, extra }: { es?: boolean; extra?: React.ReactNode }) {
  const who = await whoIsSignedIn();
  const home = who?.kind === "learner" ? "/learn" : who?.kind === "staff" ? "/admin" : "/";

  let button: React.ReactNode;
  if (who?.kind === "learner" && who.kiosk) {
    button = (
      <form action="/tablet/done" method="post">
        <button className="btn btn-primary btn-sm">{es ? "Terminé" : "I'm done"}</button>
      </form>
    );
  } else if (who) {
    button = (
      <form action={who.kind === "learner" ? logout : staffSignOut}>
        <button className="btn btn-primary btn-sm">{es ? "Salir" : "Sign out"}</button>
      </form>
    );
  } else {
    button = (
      <Link href="/" className="btn btn-primary btn-sm">
        {es ? "Entrar" : "Sign in"}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur print:hidden">
      <div className="wrap flex min-h-[72px] items-center justify-between gap-3">
        <Link href={home} aria-label={es ? "STRATLEARN Learning, inicio" : "STRATLEARN Learning, home"} className="flex items-center gap-2 no-underline">
          <Logo />
          <span className="label hidden rounded-full bg-mist px-2.5 py-1 text-[0.7rem] text-plum sm:inline">
            {es ? "Aprendizaje" : "Learning"}
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <ul className="label hidden items-center gap-1 md:flex">
            {who?.kind === "learner" && (
              <li>
                <Link href="/learn" className={link}>{es ? "Mis cursos" : "My learning"}</Link>
              </li>
            )}
            {who?.kind === "staff" && (
              <li>
                <Link href="/admin" className={link}>Manager console</Link>
              </li>
            )}
            {!(who?.kind === "learner" && who.kiosk) && (
              <li>
                <Link href="/contact" className={link}>{es ? "Contáctanos" : "Contact us"}</Link>
              </li>
            )}
          </ul>
          {extra}
          {button}
        </nav>
      </div>
    </header>
  );
}
