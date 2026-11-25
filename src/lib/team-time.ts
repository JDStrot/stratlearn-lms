import "server-only";
import { cache } from "react";
import { DEFAULT_TZ } from "./time-zones";

// The time zone of the team the manager is looking at, for this request.
// requireStaff() sets it, so console pages format dates with fmtDate() without
// passing it around. Route handlers (CSV) pass the zone explicitly instead.
const box = cache(() => ({ tz: DEFAULT_TZ }));

export function setTeamTz(tz: string) {
  box().tz = tz;
}

export function teamTz() {
  return box().tz;
}
