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

// Main time zone for each state, used when a location has a state but no time
// zone of its own. States split across zones use the zone most people live in;
// a location can pick another zone on the State rules page.
const E = "America/New_York", C = "America/Chicago", M = "America/Denver", P = "America/Los_Angeles";
export const STATE_TZ: Record<string, string> = {
  AL: C, AK: "America/Anchorage", AZ: "America/Phoenix", AR: C, CA: P, CO: M, CT: E, DE: E, DC: E, FL: E,
  GA: E, HI: "Pacific/Honolulu", ID: M, IL: C, IN: E, IA: C, KS: C, KY: E, LA: C, ME: E, MD: E, MA: E,
  MI: E, MN: C, MS: C, MO: C, MT: M, NE: C, NV: P, NH: E, NJ: E, NM: M, NY: E, NC: E, ND: C, OH: E,
  OK: C, OR: P, PA: E, RI: E, SC: E, SD: C, TN: C, TX: C, UT: M, VT: E, VA: E, WA: P, WV: E, WI: C,
  WY: M, PR: "America/Puerto_Rico",
};

/** Name from TIME_ZONES, e.g. "Pacific". */
export function tzName(tz: string) {
  return TIME_ZONES.find(([id]) => id === tz)?.[1] ?? tz;
}
