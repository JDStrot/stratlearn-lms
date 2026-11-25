import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";
import { DEFAULT_TZ, validTz } from "./time-zones";
import { locationZones, setTeamTz } from "./team-time";

export type LoginSettings = {
  pin: boolean;
  qr: boolean;
  email_password: boolean;
  email_link: boolean;
  google: boolean;
  apple: boolean;
  passkey: boolean;
  tablet: boolean;
  sms: boolean;
};

export const DEFAULT_LOGIN_SETTINGS: LoginSettings = {
  pin: true,
  qr: true,
  email_password: true,
  email_link: true,
  google: true,
  apple: true,
  passkey: true,
  tablet: true,
  sms: false,
};

export type Org = {
  id: string;
  name: string;
  join_code: string;
  default_language: "en" | "es";
  login_settings: LoginSettings;
  records_settings?: { time_zone?: unknown } | null;
  /** The team's time zone (Settings > Reminders & records). */
  time_zone: string;
};

export type StaffRole = "owner" | "admin" | "manager";

export type Staff = {
  userId: string;
  email: string;
  role: StaffRole;
  /** STRATLEARN staff: can open every client team. */
  isPlatformAdmin: boolean;
  org: Org;
  orgs: { id: string; name: string }[];
  /** Managers limited to some locations; null = the whole team. */
  locationIds: string[] | null;
};

export const ORG_COOKIE = "sl_org";

/**
 * The signed-in manager and the team they are looking at, or a redirect to
 * the manager sign-in page. Every console page and action starts here, and
 * every database call after it is scoped to staff.org.id.
 */
export async function requireStaff(): Promise<Staff> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/admin/login");

  const db = supabaseAdmin();
  const ORG_COLS = "id, name, join_code, default_language, login_settings, records_settings";
  const [{ data: rows }, { data: platform }] = await Promise.all([
    db.from("staff_members").select(`org_id, role, location_ids, organizations(${ORG_COLS})`).eq("user_id", user.id),
    db.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const isPlatformAdmin = !!platform;

  // STRATLEARN owners can open any client team ("view as manager").
  let memberships = (rows ?? []).map((r) => ({
    role: r.role as StaffRole,
    org: r.organizations as unknown as Org,
    locationIds: (r.location_ids as string[] | null)?.length ? (r.location_ids as string[]) : null,
  }));
  if (isPlatformAdmin) {
    const { data: all } = await db.from("organizations").select(ORG_COLS).order("name");
    const mine = new Set(memberships.map((m) => m.org.id));
    memberships = memberships.concat(
      ((all ?? []) as unknown as Org[]).filter((o) => !mine.has(o.id)).map((org) => ({ role: "owner" as StaffRole, org, locationIds: null })),
    );
  }
  if (!memberships.length) redirect("/admin/login?e=noaccess");

  const picked = (await cookies()).get(ORG_COOKIE)?.value;
  const m = memberships.find((x) => x.org.id === picked) ?? memberships[0];
  const org = m.org;
  org.login_settings = { ...DEFAULT_LOGIN_SETTINGS, ...(org.login_settings ?? {}) };
  org.time_zone = validTz(org.records_settings?.time_zone) ?? DEFAULT_TZ;
  setTeamTz(org.time_zone);
  // A manager limited to locations in one time zone sees that zone.
  const limited = m.role === "manager" ? m.locationIds : null;
  if (limited?.length) {
    const { zoneOf } = await locationZones(org.id);
    const zones = new Set(limited.map((id) => zoneOf(id)));
    if (zones.size === 1) setTeamTz([...zones][0]);
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role: m.role,
    isPlatformAdmin,
    org,
    orgs: memberships.map((x) => ({ id: x.org.id, name: x.org.name })),
    // Only plain managers can be limited; owners and admins see everything.
    locationIds: m.role === "manager" ? m.locationIds : null,
  };
}

/** True if this manager may see a person at this location. */
export function inScope(s: Staff, locationId: string | null) {
  return !s.locationIds || (!!locationId && s.locationIds.includes(locationId));
}

/** Owners and admins can change team settings and staff; managers run training. */
export function canManageTeam(s: Staff) {
  return s.role === "owner" || s.role === "admin";
}

export async function logEvent(s: Staff, action: string, details: Record<string, unknown> = {}) {
  await supabaseAdmin()
    .from("admin_events")
    .insert({ org_id: s.org.id, actor_id: s.userId, action, details });
}

/** A random numeric PIN that avoids easy ones like 1111 and 1234. */
export function randomPin(length = 4): string {
  const bad = new Set(["1234", "4321", "0000", "1212", "2580", "1111"]);
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    const pin = Array.from(bytes, (b) => String(b % 10)).join("");
    if (!bad.has(pin) && !/^(\d)\1+$/.test(pin)) return pin;
  }
}

export function randomToken(bytes = 24): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * House style for auto-made sign-in names (Jesse's pick, 2026-11-24).
 *   first.last  maria.lopez
 *   first.l     maria.l, then maria.lo, maria.lop ... if taken
 *   flast       mlopez
 */
export const USERNAME_STYLE: "first.last" | "first.l" | "flast" = "first.last";

/**
 * Sign-in names to try, best first. The caller adds a number only after
 * every candidate is taken (two people with the exact same name).
 */
export function usernameCandidates(name: string, style = USERNAME_STYLE): string[] {
  const parts = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/-/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return ["worker"];
  const first = parts[0];
  if (parts.length === 1) return [first];
  const last = parts[parts.length - 1];
  if (style === "flast") return [`${first[0]}${last}`, `${first}${last}`];
  if (style === "first.last") return [`${first}.${last}`];
  const out: string[] = [];
  for (let i = 1; i <= last.length; i++) out.push(`${first}.${last.slice(0, i)}`);
  return out;
}

export function suggestUsername(name: string): string {
  return usernameCandidates(name)[0];
}

/** Mobile numbers are stored as digits with country code (US default): 15551234567. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `1${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}
