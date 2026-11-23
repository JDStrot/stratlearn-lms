import Link from "next/link";
import { Logo } from "./logo";

const SITE = "https://stratlearn.co";

/** Same header as stratlearn.co, plus a "My learning" link and an optional sign-out. */
export function SiteHeader({ signOut }: { signOut?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="wrap flex min-h-[72px] items-center justify-between gap-4">
        <Link href="/learn" aria-label="STRATLEARN, my learning" className="no-underline">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <ul className="label hidden items-center gap-1 text-plum lg:flex">
            <li>
              <Link href="/learn" className="rounded-full px-3 py-3 text-violet no-underline hover:text-plum">
                My learning
              </Link>
            </li>
            <li>
              <a href={`${SITE}/#services`} className="rounded-full px-3 py-3 text-plum no-underline hover:text-violet">
                Services
              </a>
            </li>
            <li>
              <a href={`${SITE}/courses`} className="rounded-full px-3 py-3 text-plum no-underline hover:text-violet">
                Courses
              </a>
            </li>
            <li>
              <a href={`${SITE}/#about`} className="rounded-full px-3 py-3 text-plum no-underline hover:text-violet">
                About
              </a>
            </li>
          </ul>
          {signOut}
          <a href={`${SITE}/#contact`} className="btn btn-primary btn-sm hidden sm:inline-flex">
            Let&apos;s talk
          </a>
        </nav>
      </div>
    </header>
  );
}
