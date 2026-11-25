"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ORG_COOKIE, logEvent, randomToken, requireStaff } from "@/lib/staff";

/** STRATLEARN owner portal actions. Only platform admins get past requireOwner(). */
export async function requireOwner() {
  const s = await requireStaff();
  if (!s.isPlatformAdmin) redirect("/admin");
  return s;
}

export type OwnerState = { error?: string; ok?: string; password?: string };
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const PLANS = ["trial", "essentials", "pro", "small-team", "founding", "custom"];

export async function createClientTeam(_p: OwnerState, f: FormData): Promise<OwnerState> {
  const s = await requireOwner();
  const db = supabaseAdmin();
  const name = str(f, "name");
  const join_code = str(f, "joinCode").toUpperCase();
  const plan = PLANS.includes(str(f, "plan")) ? str(f, "plan") : "trial";
  const seat_limit = Number(str(f, "seats")) || null;
  if (!name) return { error: "Give the client a name." };
  if (!/^[A-Z0-9]{4,16}$/.test(join_code)) return { error: "Team code: 4 to 16 letters or numbers." };

  const { data: org, error } = await db
    .from("organizations")
    .insert({ name, join_code, plan, seat_limit, notes: str(f, "notes") || null })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "Another team already uses that code." : error.message };

  const packs = f.getAll("packs").map(String).filter(Boolean);
  if (packs.length) await db.from("org_packs").insert(packs.map((pack_id) => ({ org_id: org.id, pack_id })));

  let password: string | undefined;
  const email = str(f, "managerEmail").toLowerCase();
  if (email) {
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!userId) {
      password = `${randomToken(4)}-${randomToken(4)}`;
      const { data, error: e2 } = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (e2 || !data.user) return { error: `Client made, but the manager account failed: ${e2?.message}` };
      userId = data.user.id;
    }
    await db.from("staff_members").upsert({ user_id: userId, org_id: org.id, role: "owner", display_name: str(f, "managerName") || null });
  }
  await db.from("admin_events").insert({ org_id: org.id, actor_id: s.userId, action: "client.create", details: { name, join_code, plan } });
  revalidatePath("/admin/owner");
  return { ok: `${name} is set up${email ? ` with ${email} as its owner` : ""}.`, password };
}

export async function updateClientTeam(_p: OwnerState, f: FormData): Promise<OwnerState> {
  const s = await requireOwner();
  const id = str(f, "id");
  const status = ["active", "paused", "closed"].includes(str(f, "status")) ? str(f, "status") : "active";
  const plan = PLANS.includes(str(f, "plan")) ? str(f, "plan") : "trial";
  const { error } = await supabaseAdmin()
    .from("organizations")
    .update({ name: str(f, "name"), plan, status, seat_limit: Number(str(f, "seats")) || null, notes: str(f, "notes") || null })
    .eq("id", id);
  if (error) return { error: error.message };
  await supabaseAdmin().from("admin_events").insert({ org_id: id, actor_id: s.userId, action: "client.update", details: { plan, status } });
  revalidatePath("/admin/owner", "layout");
  return { ok: "Saved." };
}

export async function setClientPacks(_p: OwnerState, f: FormData): Promise<OwnerState> {
  const s = await requireOwner();
  const id = str(f, "id");
  const db = supabaseAdmin();
  const packs = f.getAll("packs").map(String).filter(Boolean);
  await db.from("org_packs").delete().eq("org_id", id);
  if (packs.length) await db.from("org_packs").insert(packs.map((pack_id) => ({ org_id: id, pack_id })));
  await db.from("admin_events").insert({ org_id: id, actor_id: s.userId, action: "client.packs", details: { packs } });
  revalidatePath("/admin/owner", "layout");
  return { ok: "Packs saved. Their managers can assign them now." };
}

/** "View as manager": opens the console for that client. */
export async function openClient(f: FormData) {
  const s = await requireOwner();
  const id = str(f, "id");
  (await cookies()).set(ORG_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/admin" });
  await logEvent({ ...s, org: { ...s.org, id } }, "owner.open_as_manager");
  redirect("/admin");
}

export async function togglePublished(f: FormData) {
  await requireOwner();
  const table = str(f, "kind") === "pack" ? "packs" : "courses";
  await supabaseAdmin().from(table).update({ is_published: str(f, "on") === "1" }).eq("id", str(f, "id"));
  revalidatePath("/admin/owner/library");
}

/** The course's own retraining default, used by every client unless they change it. */
export async function saveCourseDefault(_p: OwnerState, f: FormData): Promise<OwnerState> {
  const s = await requireOwner();
  const db = supabaseAdmin();
  const id = str(f, "courseId");
  const value = str(f, "repeat");
  const months = value === "never" || value === "" ? null : Math.round(Number(value));
  if (months !== null && !(months >= 1 && months <= 240)) return { error: "Pick 1 to 240 months." };
  const { data: course, error } = await db
    .from("courses")
    .update({ default_recurrence_months: months })
    .eq("id", id)
    .select("title")
    .maybeSingle();
  if (error)
    return {
      error: /default_recurrence_months|schema cache/.test(error.message)
        ? "This needs the retraining database update first."
        : error.message,
    };
  await db.from("admin_events").insert({
    org_id: s.org.id,
    actor_id: s.userId,
    action: "library.retraining",
    details: { course: course?.title, months },
  });
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

/** Contact Us inbox: mark a message handled, or move it back to new. */
export async function setFeedbackStatus(f: FormData) {
  await requireOwner();
  const status = str(f, "status") === "done" ? "done" : "new";
  await supabaseAdmin()
    .from("feedback_messages")
    .update({ status, handled_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", str(f, "id"));
  revalidatePath("/admin/owner/feedback");
  revalidatePath("/admin/owner");
}
