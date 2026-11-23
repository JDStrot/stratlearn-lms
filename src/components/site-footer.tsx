import { Logo } from "./logo";

const SITE = "https://stratlearn.co";
const LINKS = [
  { label: "Services", href: `${SITE}/#services` },
  { label: "Lottie Courses", href: `${SITE}/courses` },
  { label: "Free course", href: `${SITE}/preview` },
  { label: "Pilates Daddy", href: `${SITE}/pilates-daddy` },
  { label: "Instagram", href: "https://www.instagram.com/yourpilatesdaddy/" },
  { label: "jesse@stratlearn.co", href: "mailto:jesse@stratlearn.co" },
];

/** Same footer as stratlearn.co. */
export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto border-t border-white/10">
      <div className="wrap flex flex-col gap-8 py-14">
        <Logo tone="light" tagline />
        <ul className="label flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="inline-block py-2 no-underline hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="border-t border-white/15 pt-6 text-sm text-[#efe7ff]/80">
          © {new Date().getFullYear()} STRATLEARN · The Strategic Learning Co. · Pilates Daddy® is a STRATLEARN brand.
        </p>
      </div>
    </footer>
  );
}
