import Link from "next/link";
import { Logo } from "./logo";

/** The LMS's own footer: learning links only, no marketing pages. */
export function SiteFooter({ es = false }: { es?: boolean }) {
  const links = [
    { label: es ? "Mis cursos" : "My learning", href: "/learn" },
    { label: es ? "Ayuda" : "Help", href: es ? "/help?lang=es" : "/help" },
    { label: es ? "Contáctanos" : "Contact us", href: "/contact" },
    { label: es ? "Para gerentes" : "Manager sign in", href: "/admin/login" },
  ];
  return (
    <footer className="on-dark mt-auto border-t border-white/10 print:hidden">
      <div className="wrap flex flex-col gap-6 py-10">
        <Logo tone="light" />
        <ul className="label flex flex-wrap gap-x-6 gap-y-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-block py-2 no-underline hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-5 text-sm text-[#efe7ff]/80">
          <span>© {new Date().getFullYear()} STRATLEARN Learning</span>
          <Link href="/terms" className="no-underline hover:text-white">{es ? "Términos" : "Terms"}</Link>
          <Link href="/privacy" className="no-underline hover:text-white">{es ? "Privacidad" : "Privacy"}</Link>
          <Link href="/client-agreement" className="no-underline hover:text-white">{es ? "Acuerdo de datos" : "Client data agreement"}</Link>
        </div>
      </div>
    </footer>
  );
}
