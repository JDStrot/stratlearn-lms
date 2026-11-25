"use server";

import { cookies } from "next/headers";
import { siteOrigin } from "@/lib/origin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import {
  DEFAULT_LOGIN_SETTINGS,
  ORG_COOKIE,
  canManageTeam,
  logEvent,
  normalizePhone,
  randomPin,
  randomToken,
  requireStaff,
  usernameCandidates,
  type LoginSettings,
  type Staff,
} from "@/lib/staff";
import { appliesTo, type AssignmentRow } from "@/lib/status";

export type FormState = { error?: string; ok?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;

// ---------------------------------------------------------------------------
// Manager sign-in
// ---------------------------------------------------------------------------

export async function staffSignIn(_p: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const password = str(f, "password");
  if (!email || !password) return { error: "Enter your email and password." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password didn't match." };
  redirect("/admin");
}

export async function staffEmailLink(_p: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  if (!email) return { error: "Enter your email." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/admin` },
  });
  if (error) console.error("staff email link", error.message);
  // Same answer either way, so the form never reveals who has an account.
  return { ok: "If that email has a manager account, a sign-in link is on its way." };
}

export async function staffSignOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/admin/login");
}

export async function switchTeam(f: FormData) {
  const s = await requireStaff();
  const id = str(f, "orgId");
  if (s.orgs.some((o) => o.id === id)) {
    (await cookies()).set(ORG_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/admin" });
  }
  redirect("/admin");
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

async function findOrMake(table: "job_roles" | "locations", orgId: string, name: string | null) {
  if (!name) return null;
  const db = supabaseAdmin();
  const { data: found } = await db.from(table).select("id, name").eq("org_id", orgId);
  const hit = (found ?? []).find((r) => r.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit.id as string;
  const { data, error } = await db.from(table).insert({ org_id: orgId, name }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/**
 * Picks a sign-in name nobody on the team has yet, trying the house-style
 * candidates in order (see usernameCandidates). Only when all are taken, or
 * for a name the manager typed, does a number go on the end.
 */
async function uniqueUsername(orgId: string, candidates: string[], taken: Set<string>) {
  if (!taken.size) {
    const { data } = await supabaseAdmin().from("learners").select("username").eq("org_id", orgId);
    for (const r of data ?? []) taken.add(r.username.toLowerCase());
    taken.add("\u0000"); // mark as loaded even for an empty team
  }
  const clean = candidates.map((c) => c.toLowerCase().replace(/[^a-z0-9._-]/g, "")).filter(Boolean);
  if (!clean.length) clean.push("worker");
  let name = clean.find((c) => !taken.has(c));
  if (!name) {
    const base = clean[clean.length - 1];
    for (let i = 2; !name; i++) if (!taken.has(`${base}${i}`)) name = `${base}${i}`;
  }
  taken.add(name);
  return name;
}

export type NewPerson = { id: string; name: string; username: string; pin: string; qr: string };
export type AddState = FormState & { created?: NewPerson[] };

/**
 * Adds one worker from the form, or many from the "paste a list" box
 * (one per line: Name, Role, Location). PINs are shown once so the manager
 * can print welcome slips; only a hash is stored.
 */
export async function addPeople(_p: AddState, f: FormData): Promise<AddState> {
  const s = await requireStaff();
  const db = supabaseAdmin();
  const lang = str(f, "language") === "es" ? "es" : "en";

  type Row = { name: string; username?: string; role?: string | null; location?: string | null; email?: string | null; phone?: string | null; employeeId?: string | null; pin?: string };
  const rows: Row[] = [];
  const list = str(f, "list");
  if (list) {
    for (const line of list.split(/\r?\n/)) {
      const [name, role, location] = line.split(/[,\t]/).map((x) => x?.trim());
      if (name) rows.push({ name, role: role || opt(f, "role"), location: location || opt(f, "location") });
    }
  } else {
    const name = str(f, "name");
    if (!name) return { error: "Type the worker's name." };
    const pin = str(f, "pin");
    if (pin && !/^[0-9]{4,8}$/.test(pin)) return { error: "A PIN is 4 to 8 numbers. Or leave it blank and we'll make one." };
    const email = opt(f, "email")?.toLowerCase() ?? null;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email doesn't look right." };
    rows.push({
      name,
      username: str(f, "username"),
      role: opt(f, "role"),
      location: opt(f, "location"),
      email,
      phone: normalizePhone(opt(f, "phone")),
      employeeId: opt(f, "employeeId"),
      pin: pin || undefined,
    });
  }
  if (!rows.length) return { error: "Add at least one name." };
  if (rows.length > 500) return { error: "Add up to 500 people at a time." };
  const { data: orgRow } = await db.from("organizations").select("seat_limit").eq("id", s.org.id).single();
  if (orgRow?.seat_limit) {
    const { count } = await db.from("learners").select("id", { count: "exact", head: true }).eq("org_id", s.org.id).eq("is_active", true);
    const left = orgRow.seat_limit - (count ?? 0);
    if (rows.length > left) {
      return { error: `Your plan has ${orgRow.seat_limit} seats and ${Math.max(left, 0)} are free. Turn off people who left, or contact STRATLEARN for more seats.` };
    }
  }

  const taken = new Set<string>();
  const created: NewPerson[] = [];
  try {
    for (const r of rows) {
      const username = await uniqueUsername(s.org.id, r.username ? [r.username] : usernameCandidates(r.name), taken);
      const [job_role_id, location_id] = await Promise.all([
        findOrMake("job_roles", s.org.id, r.role ?? null),
        findOrMake("locations", s.org.id, r.location ?? null),
      ]);
      const { data, error } = await db
        .from("learners")
        .insert({
          org_id: s.org.id,
          display_name: r.name,
          username,
          job_role_id,
          location_id,
          preferred_language: lang,
          email: r.email ?? null,
          phone: r.phone ?? null,
          employee_id: r.employeeId ?? null,
        })
        .select("id, qr_token")
        .single();
      if (error) throw new Error(error.message.includes("email") ? `${r.email} is already on this team.` : error.message);
      const pin = r.pin ?? randomPin();
      const res = await db.rpc("set_learner_pin", { p_learner_id: data.id, p_pin: pin });
      if (res.error) throw new Error(res.error.message);
      created.push({ id: data.id, name: r.name, username, pin, qr: data.qr_token });
    }
  } catch (e) {
    revalidatePath("/admin", "layout");
    return { error: `Stopped after ${created.length}: ${(e as Error).message}`, created };
  }
  await logEvent(s, "people.add", { count: created.length, usernames: created.map((c) => c.username) });
  revalidatePath("/admin", "layout");
  return { created, ok: `Added ${created.length} ${created.length === 1 ? "person" : "people"}.` };
}

async function ownPerson(s: Staff, id: string) {
  const { data } = await supabaseAdmin()
    .from("learners")
    .select("id, display_name, username")
    .eq("id", id)
    .eq("org_id", s.org.id)
    .maybeSingle();
  if (!data) throw new Error("Not on this team.");
  return data;
}

export async function updatePerson(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  const id = str(f, "id");
  await ownPerson(s, id);
  const name = str(f, "name");
  const username = str(f, "username").toLowerCase();
  if (!name || !username) return { error: "Name and sign-in name are needed." };
  if (!/^[a-z0-9._-]{2,40}$/.test(username)) return { error: "Sign-in name: letters, numbers, dots or dashes only." };
  const email = opt(f, "email")?.toLowerCase() ?? null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email doesn't look right." };
  const [job_role_id, location_id] = await Promise.all([
    findOrMake("job_roles", s.org.id, opt(f, "role")),
    findOrMake("locations", s.org.id, opt(f, "location")),
  ]);
  const { error } = await supabaseAdmin()
    .from("learners")
    .update({
      display_name: name,
      username,
      email,
      phone: normalizePhone(opt(f, "phone")),
      employee_id: opt(f, "employeeId"),
      preferred_language: str(f, "language") === "es" ? "es" : "en",
      job_role_id,
      location_id,
    })
    .eq("id", id)
    .eq("org_id", s.org.id);
  if (error) {
    if (error.code === "23505") return { error: "Someone on this team already uses that sign-in name or email." };
    return { error: error.message };
  }
  await logEvent(s, "person.update", { learner_id: id, username });
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

export type PinState = FormState & { pin?: string };

export async function resetPin(_p: PinState, f: FormData): Promise<PinState> {
  const s = await requireStaff();
  const id = str(f, "id");
  const person = await ownPerson(s, id);
  const wanted = str(f, "pin");
  if (wanted && !/^[0-9]{4,8}$/.test(wanted)) return { error: "A PIN is 4 to 8 numbers." };
  const pin = wanted || randomPin();
  const { error } = await supabaseAdmin().rpc("set_learner_pin", { p_learner_id: id, p_pin: pin });
  if (error) return { error: error.message };
  await logEvent(s, "person.pin_reset", { learner_id: id, username: person.username });
  revalidatePath(`/admin/people/${id}`);
  return { pin, ok: `New PIN for ${person.display_name}.` };
}

export async function newBadge(f: FormData) {
  const s = await requireStaff();
  const id = str(f, "id");
  const person = await ownPerson(s, id);
  await supabaseAdmin().from("learners").update({ qr_token: randomToken() }).eq("id", id).eq("org_id", s.org.id);
  await logEvent(s, "person.qr_reissued", { learner_id: id, username: person.username });
  revalidatePath(`/admin/people/${id}`);
}

export async function setActive(f: FormData) {
  const s = await requireStaff();
  const id = str(f, "id");
  const person = await ownPerson(s, id);
  const active = str(f, "active") === "1";
  const patch: Record<string, unknown> = { is_active: active };
  // Turning someone off also kills their printed badge.
  if (!active) patch.qr_token = randomToken();
  await supabaseAdmin().from("learners").update(patch).eq("id", id).eq("org_id", s.org.id);
  await logEvent(s, active ? "person.reactivate" : "person.deactivate", { learner_id: id, username: person.username });
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function assignTraining(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  const db = supabaseAdmin();
  const what = str(f, "what"); // "course:<id>" or "pack:<id>:<path|*>"
  const who = str(f, "who"); // "all", "role:<id>", "location:<id>", "person:<id>"
  // "" = follow the team or course rule, "never" = no retraining, a number = months.
  const repeatRaw = str(f, "repeat");
  const repeatCustom = repeatRaw !== "";
  const repeat = repeatRaw === "never" ? null : Math.min(Number(repeatRaw) || 0, 240) || null;
  if (repeatRaw && repeatRaw !== "never" && !repeat) return { error: "Pick how often it repeats." };
  // "Have them take it again": finishes from before now don't count.
  const retake = str(f, "retake") === "on";
  const dueDays = str(f, "dueDays");
  const dueDate = str(f, "dueDate");

  let due_at: string | null = null;
  if (dueDays === "date" && dueDate) due_at = new Date(`${dueDate}T23:59:00`).toISOString();
  else if (dueDays && dueDays !== "none" && dueDays !== "date") {
    const d = new Date();
    d.setDate(d.getDate() + Number(dueDays));
    d.setHours(23, 59, 0, 0);
    due_at = d.toISOString();
  }

  const target: { learner_id: string | null; job_role_id: string | null; location_id: string | null } = {
    learner_id: null,
    job_role_id: null,
    location_id: null,
  };
  const [kind, targetId] = who.split(":");
  const checkTable = { role: "job_roles", location: "locations", person: "learners" } as const;
  if (kind !== "all") {
    const table = checkTable[kind as keyof typeof checkTable];
    if (!table || !targetId) return { error: "Choose who should take it." };
    const { data } = await db.from(table).select("id").eq("id", targetId).eq("org_id", s.org.id).maybeSingle();
    if (!data) return { error: "Choose who should take it." };
    if (kind === "role") target.job_role_id = targetId;
    if (kind === "location") target.location_id = targetId;
    if (kind === "person") target.learner_id = targetId;
  }

  const [wkind, wid, wpath] = what.split(":");
  let courseIds: string[] = [];
  let pack_id: string | null = null;
  let pack_path: string | null = null;
  if (wkind === "course") {
    const { data } = await db.from("courses").select("id").eq("id", wid).eq("is_published", true).maybeSingle();
    if (data) courseIds = [data.id];
  } else if (wkind === "pack") {
    const { data: on } = await db.from("org_packs").select("pack_id").eq("org_id", s.org.id).eq("pack_id", wid).maybeSingle();
    if (on) {
      pack_id = wid;
      pack_path = wpath && wpath !== "*" ? wpath : null;
      let q = db.from("pack_courses").select("course_id, courses!inner(is_published)").eq("pack_id", wid).eq("courses.is_published", true);
      if (pack_path) q = q.eq("path", pack_path);
      const { data } = await q;
      courseIds = [...new Set((data ?? []).map((r) => r.course_id as string))];
    }
  }
  if (!courseIds.length) return { error: "Choose a course or a pack." };

  // Who this reaches, to tell the manager how many already had it.
  let peopleQ = db.from("learners").select("id, job_role_id, location_id").eq("org_id", s.org.id).eq("is_active", true);
  if (target.learner_id) peopleQ = peopleQ.eq("id", target.learner_id);
  if (target.job_role_id) peopleQ = peopleQ.eq("job_role_id", target.job_role_id);
  if (target.location_id) peopleQ = peopleQ.eq("location_id", target.location_id);
  const [{ data: people }, { data: allExisting }, { data: finished }] = await Promise.all([
    peopleQ,
    db.from("assignments").select("*").eq("org_id", s.org.id).in("course_id", courseIds),
    db.from("completions").select("learner_id, course_id").eq("org_id", s.org.id).in("course_id", courseIds),
  ]);
  const reach = people ?? [];
  const existing = (allExisting ?? []) as AssignmentRow[];
  const done = new Set((finished ?? []).map((c) => `${c.learner_id}|${c.course_id}`));
  let alreadyHad = 0;
  let alreadyDone = 0;
  for (const p of reach) {
    const had = courseIds.some((cid) => existing.some((a) => a.course_id === cid && appliesTo(a, p)));
    if (had) alreadyHad++;
    if (courseIds.some((cid) => done.has(`${p.id}|${cid}`))) alreadyDone++;
  }

  // The same group already has this course: don't add it twice. With
  // "take it again" (or a new due date / repeat) update that assignment instead.
  const sameGroup = (a: AssignmentRow) =>
    a.learner_id === target.learner_id && a.job_role_id === target.job_role_id && a.location_id === target.location_id;
  const have = new Map(existing.filter(sameGroup).map((a) => [a.course_id, a.id]));
  const now = new Date().toISOString();
  const repeatCols = repeatCustom ? { recurrence_months: repeat, recurrence_custom: true } : {};
  const rows = courseIds
    .filter((id) => !have.has(id))
    .map((course_id) => ({
      org_id: s.org.id,
      course_id,
      ...target,
      due_at,
      recurrence_months: repeatCustom ? repeat : null,
      ...(repeatCustom ? { recurrence_custom: true } : {}),
      ...(retake ? { retake_after: now } : {}),
      pack_id,
      pack_path,
      assigned_by: s.userId,
    }));
  if (rows.length) {
    const { error } = await db.from("assignments").insert(rows);
    if (error) return { error: friendlyDbError(error.message) };
  }
  const updateIds = [...have.values()];
  if (updateIds.length && (retake || repeatCustom)) {
    const { error } = await db
      .from("assignments")
      .update({ ...(retake ? { retake_after: now, due_at } : {}), ...repeatCols })
      .in("id", updateIds);
    if (error) return { error: friendlyDbError(error.message) };
  }
  await logEvent(s, retake ? "assign.retake" : "assign", {
    what,
    who,
    due_at,
    repeat: repeatCustom ? (repeat ?? "never") : "course rule",
    added: rows.length,
    people: reach.length,
    already_had: alreadyHad,
  });
  revalidatePath("/admin", "layout");

  const n = reach.length;
  const ppl = (k: number) => `${k} ${k === 1 ? "person" : "people"}`;
  const courses = courseIds.length === 1 ? "it" : "these";
  if (retake)
    return {
      ok:
        `Assigned to ${ppl(n)}. Everyone has to take ${courses} again, even if they finished before.` +
        (alreadyDone ? ` Old records and certificates for ${ppl(alreadyDone)} stay on file.` : ""),
    };
  if (n && alreadyHad === n && !rows.length)
    return { ok: `Already assigned: ${n === 1 ? "this person already has" : `all ${ppl(n)} already have`} ${courses}. Nothing changed. To make someone redo it, tick "Have them take it again".` };
  return {
    ok:
      `Assigned to ${ppl(n)}.` +
      (alreadyHad ? ` ${alreadyHad} already had ${courses}, so nothing was doubled.` : "") +
      (alreadyDone ? ` ${alreadyDone} finished it before, and that still counts until any retraining date. Tick "Have them take it again" to make them redo it now.` : ""),
  };
}

/** Plain words when the retraining database update hasn't been run yet. */
function friendlyDbError(msg: string) {
  return /recurrence_custom|retake_after/.test(msg)
    ? "This option needs the retraining database update. Ask STRATLEARN to run it."
    : msg;
}

/** Removes one assignment, or every course of a pack assignment (same group). */
export async function removeAssignment(f: FormData) {
  const s = await requireStaff();
  const db = supabaseAdmin();
  const ids = str(f, "ids").split(",").filter(Boolean);
  if (!ids.length) return;
  await db.from("assignments").delete().eq("org_id", s.org.id).in("id", ids);
  await logEvent(s, "unassign", { assignment_ids: ids });
  revalidatePath("/admin", "layout");
}

// ---------------------------------------------------------------------------
// Team settings (owners and admins)
// ---------------------------------------------------------------------------

async function requireTeamAdmin() {
  const s = await requireStaff();
  if (!canManageTeam(s)) throw new Error("Only owners and admins can change team settings.");
  return s;
}

export async function saveTeam(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireTeamAdmin();
  const name = str(f, "name");
  const join_code = str(f, "joinCode").toUpperCase();
  if (!name) return { error: "Give the team a name." };
  if (!/^[A-Z0-9]{4,16}$/.test(join_code)) return { error: "Team code: 4 to 16 letters or numbers, no spaces." };
  const { error } = await supabaseAdmin()
    .from("organizations")
    .update({ name, join_code, default_language: str(f, "language") === "es" ? "es" : "en" })
    .eq("id", s.org.id);
  if (error) return { error: error.code === "23505" ? "Another team already uses that code." : error.message };
  await logEvent(s, "team.update", { name, join_code });
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

export async function saveLoginSettings(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireTeamAdmin();
  const next = {} as LoginSettings;
  for (const k of Object.keys(DEFAULT_LOGIN_SETTINGS) as (keyof LoginSettings)[]) next[k] = f.get(k) === "on";
  if (!next.pin && !next.qr && !next.email_password && !next.email_link) {
    return { error: "Keep at least one of PIN, QR badge or email on, so nobody gets locked out." };
  }
  await supabaseAdmin().from("organizations").update({ login_settings: next }).eq("id", s.org.id);
  await logEvent(s, "team.login_settings", next);
  revalidatePath("/admin", "layout");
  return { ok: "Sign-in options saved." };
}

export async function addGroup(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  const kind = str(f, "kind") === "location" ? "locations" : "job_roles";
  const name = str(f, "name");
  if (!name) return { error: "Type a name." };
  await findOrMake(kind, s.org.id, name);
  revalidatePath("/admin", "layout");
  return { ok: `Added ${name}.` };
}

export async function removeGroup(f: FormData) {
  const s = await requireTeamAdmin();
  const kind = str(f, "kind") === "location" ? "locations" : "job_roles";
  await supabaseAdmin().from(kind).delete().eq("id", str(f, "id")).eq("org_id", s.org.id);
  await logEvent(s, "team.remove_group", { kind, id: str(f, "id") });
  revalidatePath("/admin", "layout");
}

export type StaffState = FormState & { password?: string };

/**
 * Adds a manager. New accounts get a one-time password to hand over; people
 * who already have an account are just added to this team.
 */
export async function addStaff(_p: StaffState, f: FormData): Promise<StaffState> {
  const s = await requireTeamAdmin();
  const email = str(f, "email").toLowerCase();
  const role = (["admin", "manager"].includes(str(f, "role")) ? str(f, "role") : "manager") as "admin" | "manager";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Type their email." };
  const db = supabaseAdmin();

  let userId: string | null = null;
  let password: string | undefined;
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  if (!userId) {
    password = `${randomToken(4)}-${randomToken(4)}`;
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return { error: error?.message ?? "Could not create the account." };
    userId = data.user.id;
  }
  const { error } = await db
    .from("staff_members")
    .upsert({ user_id: userId, org_id: s.org.id, role, display_name: opt(f, "name") }, { onConflict: "user_id,org_id" });
  if (error) return { error: error.message };
  await logEvent(s, "staff.add", { email, role });
  revalidatePath("/admin/settings");
  return {
    ok: password ? `Account made for ${email}.` : `${email} already had an account and can now see this team.`,
    password,
  };
}

export async function removeStaff(f: FormData) {
  const s = await requireTeamAdmin();
  const userId = str(f, "userId");
  if (userId === s.userId) return;
  const { data: target } = await supabaseAdmin()
    .from("staff_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", s.org.id)
    .maybeSingle();
  if (!target || (target.role === "owner" && s.role !== "owner")) return;
  await supabaseAdmin().from("staff_members").delete().eq("user_id", userId).eq("org_id", s.org.id);
  await logEvent(s, "staff.remove", { user_id: userId });
  revalidatePath("/admin/settings");
}

/** Clears a PIN lockout (5 wrong tries) without changing the PIN. */
export async function unlockPerson(f: FormData) {
  const s = await requireStaff();
  const id = str(f, "id");
  const person = await ownPerson(s, id);
  await supabaseAdmin()
    .from("learners")
    .update({ failed_pin_attempts: 0, locked_until: null })
    .eq("id", id)
    .eq("org_id", s.org.id);
  await logEvent(s, "person.unlock", { learner_id: id, username: person.username });
  revalidatePath(`/admin/people/${id}`);
}

// ---------------------------------------------------------------------------
// Learner sign-in help (email accounts) and shared tablets
// ---------------------------------------------------------------------------

/** Sets a new password on a worker's email sign-in (making the account if needed). */
export async function setLearnerPassword(_p: StaffState, f: FormData): Promise<StaffState> {
  const s = await requireStaff();
  const id = str(f, "id");
  await ownPerson(s, id);
  const db = supabaseAdmin();
  const { data: p } = await db.from("learners").select("email, auth_user_id").eq("id", id).single();
  if (!p?.email) return { error: "Add their email first (Details, below)." };
  const password = str(f, "password") || `${randomToken(3)}-${randomToken(3)}`;
  if (password.length < 8) return { error: "Use at least 8 characters." };
  let authId = p.auth_user_id as string | null;
  if (authId) {
    const { error } = await db.auth.admin.updateUserById(authId, { password, email: p.email, email_confirm: true });
    if (error) return { error: error.message };
  } else {
    const { data, error } = await db.auth.admin.createUser({ email: p.email, password, email_confirm: true });
    if (error || !data.user) return { error: "That email already has an account somewhere. Ask them to use “Email me a link” once to connect it." };
    authId = data.user.id;
    await db.from("learners").update({ auth_user_id: authId }).eq("id", id);
  }
  await logEvent(s, "person.password_reset", { learner_id: id });
  return { ok: "Password set.", password };
}

/** Emails the worker a one-tap sign-in link (also works as "forgot password"). */
export async function emailLearnerLink(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  const id = str(f, "id");
  await ownPerson(s, id);
  const { data: p } = await supabaseAdmin().from("learners").select("email").eq("id", id).single();
  if (!p?.email) return { error: "Add their email first (Details, below)." };
  const { supabaseAnonNoSession } = await import("@/lib/learner-auth");
  const { error } = await supabaseAnonNoSession().auth.signInWithOtp({
    email: p.email,
    options: { shouldCreateUser: true, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/learn&m=email_link` },
  });
  if (error) return { error: "Couldn't send the email just now. Try again soon, or reset their PIN." };
  await logEvent(s, "person.email_link", { learner_id: id });
  return { ok: `Sign-in link sent to ${p.email}.` };
}

/** Turns this device into the team's shared tablet (name list + PIN pad). */
export async function startTablet() {
  const s = await requireStaff();
  if (!s.org.login_settings.tablet) redirect("/admin/settings");
  const { setTablet } = await import("@/lib/tablet");
  await setTablet(s.org.id);
  await logEvent(s, "tablet.setup");
  await supabaseServer().then((sb) => sb.auth.signOut({ scope: "local" }));
  redirect("/tablet");
}

// ---------------------------------------------------------------------------
// Due dates and retraining (team settings)
// ---------------------------------------------------------------------------

const dbUpdateMissing = (msg: string) =>
  /training_settings|org_course_settings|does not exist|schema cache/.test(msg)
    ? "These settings need the retraining database update. Ask STRATLEARN to run it."
    : msg;

/** Default due days, grace days before overdue, and how early retraining shows up. */
export async function saveTrainingTiming(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  if (!canManageTeam(s)) return { error: "Only owners and admins can change this." };
  const days = (k: string, max: number) => {
    const v = str(f, k);
    if (v === "") return null;
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= max ? n : NaN;
  };
  const due = str(f, "dueDays") === "none" ? null : days("dueDays", 365);
  const grace = days("graceDays", 90) ?? 0;
  const notice = days("noticeDays", 180) ?? 30;
  if ([due, grace, notice].some((v) => Number.isNaN(v))) return { error: "Use whole numbers of days." };
  const training_settings = { default_due_days: due, grace_days: grace, retrain_notice_days: notice };
  const { error } = await supabaseAdmin().from("organizations").update({ training_settings }).eq("id", s.org.id);
  if (error) return { error: dbUpdateMissing(error.message) };
  await logEvent(s, "settings.training", training_settings);
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

/**
 * This team's retraining rule for one course.
 * "" = follow the course default, "never" = no retraining, number = months.
 */
export async function saveCourseRule(_p: FormState, f: FormData): Promise<FormState> {
  const s = await requireStaff();
  if (!canManageTeam(s)) return { error: "Only owners and admins can change this." };
  const db = supabaseAdmin();
  const course_id = str(f, "courseId");
  const value = str(f, "repeat");
  const { data: course } = await db.from("courses").select("id, title").eq("id", course_id).maybeSingle();
  if (!course) return { error: "Course not found." };
  let error;
  if (value === "") {
    ({ error } = await db.from("org_course_settings").delete().eq("org_id", s.org.id).eq("course_id", course_id));
  } else {
    const months = value === "never" ? null : Math.round(Number(value));
    if (months !== null && !(months >= 1 && months <= 240)) return { error: "Pick 1 to 240 months." };
    ({ error } = await db.from("org_course_settings").upsert({
      org_id: s.org.id,
      course_id,
      recurrence_months: months,
      updated_by: s.userId,
      updated_at: new Date().toISOString(),
    }));
  }
  if (error) return { error: dbUpdateMissing(error.message) };
  await logEvent(s, "settings.retraining", { course: course.title, repeat: value || "course default" });
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}
