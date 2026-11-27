import Link from "next/link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

/** Shared shell for long reading pages (legal pages, help). */
export function DocPage({
  eyebrow,
  title,
  updated,
  draft = false,
  es = false,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  updated?: string;
  /** Shows the "draft, under legal review" banner. Remove once a lawyer signs off. */
  draft?: boolean;
  es?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader es={es} />
      <main id="main" className="flex-1 bg-paper">
        <div className="wrap py-12 lg:py-16">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-[2.4rem] sm:text-5xl">{title}</h1>
          {updated && <p className="mt-3 text-sm text-muted">{es ? "Actualizado" : "Last updated"}: {updated}</p>}
          {draft && (
            <p role="note" className="mt-6 max-w-[46rem] rounded-[12px] border border-violet/40 bg-mist px-4 py-3 text-sm text-plum">
              <strong>Draft for legal review.</strong> This page is a working draft and is not final until it has been
              reviewed by a lawyer. Questions? <Link href="/contact">Contact us</Link>.
            </p>
          )}
          <article className="doc mt-8">{children}</article>
        </div>
      </main>
      <SiteFooter es={es} />
    </>
  );
}

/** Legal facts that appear on several pages. Fill in the bracketed items before launch. */
export const LEGAL = {
  company: "STRATLEARN LLC",
  site: "learn.stratlearn.co",
  state: "[STATE]",
  address: "[MAILING ADDRESS]",
  updated: "November 27, 2026",
};
