import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openClient, requireOwner } from "../../../../owner-actions";
import { fmtDate } from "../../../../data";
import { PageHead } from "../../../../ui";
import { ClientForm, ClientPacks } from "./forms";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOwner();
  const db = supabaseAdmin();
  const [{ data: org }, { data: packs }, { data: on }, { data: staff }, { count: people }, { data: events }] = await Promise.all([
    db.from("organizations").select("id, name, join_code, plan, status, seat_limit, notes, created_at").eq("id", id).maybeSingle(),
    db.from("packs").select("id, title").eq("is_published", true).order("title"),
    db.from("org_packs").select("pack_id").eq("org_id", id),
    db.from("staff_members").select("user_id, role, display_name").eq("org_id", id),
    db.from("learners").select("id", { count: "exact", head: true }).eq("org_id", id).eq("is_active", true),
    db.from("admin_events").select("created_at, action").eq("org_id", id).order("created_at", { ascending: false }).limit(15),
  ]);
  if (!org) notFound();
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const email = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <>
      <p className="mb-2"><Link href="/admin/owner" className="label">← All clients</Link></p>
      <PageHead eyebrow={`★ Client · ${org.join_code}`} title={org.name}>
        <form action={openClient}>
          <input type="hidden" name="id" value={org.id} />
          <button className="btn btn-primary btn-sm">View as manager</button>
        </form>
      </PageHead>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 text-3xl">Account</h2>
          <p className="mb-4 text-sm text-muted">
            {people ?? 0} active learners{org.seat_limit ? ` of ${org.seat_limit} seats` : ""} · client since {fmtDate(org.created_at)}
          </p>
          <ClientForm org={org} />
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-3xl">Packs</h2>
          <ClientPacks id={org.id} packs={packs ?? []} on={(on ?? []).map((x) => x.pack_id)} />
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-3xl">Managers</h2>
          <ul className="divide-y divide-line">
            {(staff ?? []).length === 0 && <li className="text-muted">No managers yet. Add one by viewing as manager, then Team settings.</li>}
            {(staff ?? []).map((m) => (
              <li key={m.user_id} className="flex justify-between gap-3 py-2">
                <span>{m.display_name || email.get(m.user_id)}<span className="block text-sm text-muted">{email.get(m.user_id)}</span></span>
                <span className="chip">{m.role}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-3xl">Recent <em>activity</em></h2>
          <ul className="flex flex-col gap-1 text-sm">
            {(events ?? []).length === 0 && <li className="text-muted">Nothing yet.</li>}
            {(events ?? []).map((e, i) => (
              <li key={i} className="flex justify-between gap-3"><span>{e.action}</span><span className="text-muted">{fmtDate(e.created_at)}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
