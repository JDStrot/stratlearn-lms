/**
 * Team time zones. The servers run on UTC, so every date a manager sees in the
 * console, in CSV reports and in emailed reports is shown in the team's own
 * time zone (Settings > Reminders & records). Learner screens and certificates
 * use the viewer's own device time zone instead (components/local-date.tsx).
 */
export const DEFAULT_TZ = "America/Los_Angeles";

export const TIME_ZONES: [string, string][] = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
  ["America/Puerto_Rico", "Atlantic (Puerto Rico)"],
];

/** A real IANA time zone name, or null. */
export function validTz(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: v });
    return v;
  } catch {
    return null;
  }
}

/** "2026-11-24" in the given time zone. */
export function dayIn(iso: string | null | undefined, tz: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
}

/** "2026-11-24 20:27" in the given time zone. */
export function dateTimeIn(iso: string | null | undefined, tz: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${dayIn(iso, tz)} ${time}`;
}

/** Short name for a CSV column header, e.g. "PST". */
export function tzShort(tz: string) {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? tz
  );
}
