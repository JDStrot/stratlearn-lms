"use client";

import "./globals.css";
import { ErrorScreen, useReportError } from "@/components/error-screen";

/** Last-resort screen when even the main layout fails. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <ErrorScreen retry={reset} />
      </body>
    </html>
  );
}
