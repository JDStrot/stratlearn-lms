import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "STRATLEARN · Page not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center bg-paper">
        <div className="wrap flex max-w-xl flex-col items-start gap-4 py-20">
          <p className="eyebrow">✦ 404</p>
          <h1 className="text-[2.4rem] sm:text-5xl">
            We can&apos;t find that <em>page</em>.
          </h1>
          <p className="text-lg">The link may be old or mistyped.</p>
          <p className="text-muted">No encontramos esa página. Puede que el enlace sea viejo o tenga un error.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-primary">Home · Inicio</Link>
            <Link href="/help" className="btn btn-ghost">Help · Ayuda</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
