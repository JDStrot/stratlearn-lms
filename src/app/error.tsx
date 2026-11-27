"use client";

import { ErrorScreen, useReportError } from "@/components/error-screen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportError(error);
  return <ErrorScreen retry={reset} />;
}
