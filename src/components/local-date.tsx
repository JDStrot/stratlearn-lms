"use client";

import { useEffect, useState } from "react";

/**
 * A date (and optionally time) shown in the viewer's own time zone.
 * The server runs on UTC, so an evening finish in California would otherwise
 * show as the next day. The server's guess is replaced as soon as the page loads.
 */
export function LocalDate({
  iso,
  lang = "en",
  time = false,
  opts,
}: {
  iso: string;
  lang?: string;
  time?: boolean;
  opts?: Intl.DateTimeFormatOptions;
}) {
  const fmt = (tz?: string) =>
    new Date(iso).toLocaleString(lang === "es" ? "es" : "en-US", {
      ...(opts ?? { month: "short", day: "numeric", year: "numeric" }),
      ...(time ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
      ...(tz ? { timeZone: tz } : {}),
    });
  const [text, setText] = useState(() => fmt("UTC"));
  useEffect(() => setText(fmt()), [iso, lang, time]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
