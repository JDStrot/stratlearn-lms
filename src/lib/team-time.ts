import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "./supabase/admin";
import { DEFAULT_TZ, STATE_TZ, validTz } from "./time-zones";

// The time zone for this request's console pages. requireStaff() sets it: the
// team's zone, or a location-limited manager's own location zone. Console pages
// then format dates with fmtDate() without passing it around. Route handlers
// (CSV) and the daily job use locationZones() per person instead.
const box = cache(() => ({ tz: DEFAULT_TZ }));

export function setTeamTz(tz: string) {
  box().tz = tz;
}

export function teamTz() {
  return box().tz;
}

/** Location time zones picked by hand, kept in records_settings JSON. */
export function readLocationZones(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const tz = validTz(v);
      if (tz && /^[0-9a-f-]{36}$/i.test(k)) out[k] = tz;
    }
  }
  return out;
}

/**
 * Time zone for each location: the one picked for it, else its state's main
 * zone, else the team's zone. zoneOf(null) is the team's zone.
 */
export async function locationZones(orgId: string) {
  const db = supabaseAdmin();
  const [{ data: org }, { data: locs }] = await Promise.all([
    db.from("organizations").select("records_settings").eq("id", orgId).maybeSingle(),
    db.from("locations").select("id, state").eq("org_id", orgId),
  ]);
  const rec = (org?.records_settings ?? {}) as { time_zone?: unknown; location_time_zones?: unknown };
  const team = validTz(rec.time_zone) ?? DEFAULT_TZ;
  const picked = readLocationZones(rec.location_time_zones);
  const byLoc = new Map<string, string>();
  for (const l of locs ?? []) {
    byLoc.set(l.id, picked[l.id] ?? (l.state ? STATE_TZ[String(l.state).toUpperCase()] : undefined) ?? team);
  }
  return {
    team,
    picked,
    zoneOf: (locationId: string | null | undefined) => (locationId && byLoc.get(locationId)) || team,
  };
}
