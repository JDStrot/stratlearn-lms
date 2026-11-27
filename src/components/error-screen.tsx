"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Sends a browser-side crash to error alerts. Server errors (with a digest) are already reported. */
export function useReportError(error: Error & { digest?: string }) {
  useEffect(() => {
    if (error.digest) return;
    try {
      void fetch("/api/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "browser", message: `${error.name}: ${error.message}`, path: location.pathname }),
        keepalive: true,
      });
    } catch {}
  }, [error]);
}

/** Friendly "something went wrong" screen, in English and Spanish. */
export function ErrorScreen({ retry }: { retry?: () => void }) {
  return (
    <main id="main" className="flex flex-1 items-center bg-paper">
      <div className="wrap flex max-w-xl flex-col items-start gap-4 py-20">
        <p className="eyebrow">✦ Oops</p>
        <h1 className="text-[2.4rem] sm:text-5xl">
          Something went <em>wrong</em>.
        </h1>
        <p className="text-lg">We&apos;ve been told about it and we&apos;re on it. Please try again in a moment.</p>
        <p className="text-muted">Algo salió mal. Ya nos avisaron. Inténtalo otra vez en un momento.</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {retry && (
            <button type="button" onClick={retry} className="btn btn-primary">
              Try again · Reintentar
            </button>
          )}
          <Link href="/" className="btn btn-ghost">Home · Inicio</Link>
          <Link href="/help" className="btn btn-ghost">Help · Ayuda</Link>
        </div>
      </div>
    </main>
  );
}
