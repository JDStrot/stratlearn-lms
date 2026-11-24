import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner, togglePublished } from "../../../owner-actions";
import { fmtDate } from "../../../data";
import { PageHead } from "../../../ui";

/** Every course and pack: publish state, version, how many clients and finishes. */
export default async function Library() {
  await requireOwner();
  const db = supabaseAdmin();
  const [{ data: courses }, { data: packs }, { data: orgPacks }, { data: done }, { data: links }] = await Promise.all([
    db.from("courses").select("id, slug, title, minutes, version, is_published, updated_at").order("title"),
    db.from("packs").select("id, title, industry, is_published").order("title"),
    db.from("org_packs").select("pack_id"),
    db.from("completions").select("course_id").limit(200000),
    db.from("pack_courses").select("pack_id, course_id"),
  ]);
  const clientsPerPack = new Map<string, number>();
  for (const r of orgPacks ?? []) clientsPerPack.set(r.pack_id, (clientsPerPack.get(r.pack_id) ?? 0) + 1);
  const finishes = new Map<string, number>();
  for (const r of done ?? []) finishes.set(r.course_id, (finishes.get(r.course_id) ?? 0) + 1);
  const coursesPerPack = new Map<string, number>();
  for (const r of links ?? []) coursesPerPack.set(r.pack_id, (coursesPerPack.get(r.pack_id) ?? 0) + 1);

  const Toggle = ({ kind, id, on }: { kind: "course" | "pack"; id: string; on: boolean }) => (
    <form action={togglePublished}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <button className={`chip ${on ? "border-success/40 bg-success/10 text-success" : "text-muted"}`}>{on ? "Live" : "Hidden"}</button>
    </form>
  );

  return (
    <>
      <p className="mb-2"><Link href="/admin/owner" className="label">← All clients</Link></p>
      <PageHead eyebrow="★ Owner portal" title={<>Course <em>library</em></>} />
      <p className="mb-6 max-w-2xl text-muted">
        Hidden courses and packs disappear for every client, but finished records and certificates stay. New courses go live
        when they are added to the catalog and the site deploys.
      </p>
      <section className="card mb-8 overflow-x-auto">
        <h2 className="px-6 pt-6 text-3xl">Packs</h2>
        <table className="mt-4 w-full min-w-[600px] text-left">
          <thead className="label border-y border-line text-muted"><tr><th className="px-6 py-3">Pack</th><th className="px-4 py-3">Courses</th><th className="px-4 py-3">Clients</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(packs ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-3 font-medium">{p.title}<span className="block text-sm font-normal text-muted">{p.industry}</span></td>
                <td className="px-4 py-3">{coursesPerPack.get(p.id) ?? 0}</td>
                <td className="px-4 py-3">{clientsPerPack.get(p.id) ?? 0}</td>
                <td className="px-4 py-3"><Toggle kind="pack" id={p.id} on={p.is_published} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card overflow-x-auto">
        <h2 className="px-6 pt-6 text-3xl">Courses <span className="text-muted">({(courses ?? []).length})</span></h2>
        <table className="mt-4 w-full min-w-[700px] text-left">
          <thead className="label border-y border-line text-muted"><tr><th className="px-6 py-3">Course</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Finishes</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(courses ?? []).map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-3"><span className="font-medium">{c.title}</span><span className="block text-sm text-muted">{c.slug}{c.minutes ? ` · ${c.minutes} min` : ""}</span></td>
                <td className="px-4 py-3">v{c.version}</td>
                <td className="px-4 py-3">{finishes.get(c.id) ?? 0}</td>
                <td className="px-4 py-3 text-muted">{fmtDate(c.updated_at)}</td>
                <td className="px-4 py-3"><Toggle kind="course" id={c.id} on={c.is_published} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
