import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner, saveCourseDefault, togglePublished } from "../../../owner-actions";
import { RepeatPicker } from "../../../repeat-picker";
import { fmtDate } from "../../../data";
import { PageHead } from "../../../ui";

/** Every course and pack: publish state, version, how many clients and finishes. */
export default async function Library({ searchParams }: { searchParams: Promise<{ q?: string; repeat?: string }> }) {
  const { q, repeat } = await searchParams;
  await requireOwner();
  const db = supabaseAdmin();
  const [{ data: allCourses }, { data: packs }, { data: orgPacks }, { data: done }, { data: links }, versions] = await Promise.all([
    // "*" so the page works before and after the retraining database update.
    db.from("courses").select("*").order("title"),
    db.from("packs").select("id, title, industry, is_published").order("title"),
    db.from("org_packs").select("pack_id"),
    db.from("completions").select("course_id, course_version").limit(200000),
    db.from("pack_courses").select("pack_id, course_id"),
    db.from("course_versions").select("course_id, version, notes, published_at").order("version", { ascending: false }),
  ]);
  type C = {
    id: string; slug: string; title: string; minutes: number | null; version: number; is_published: boolean; updated_at: string;
    default_recurrence_months?: number | null; recurrence_note?: string | null;
  };
  const needle = (q ?? "").toLowerCase();
  const courses = ((allCourses ?? []) as C[]).filter(
    (c) =>
      (!needle || c.title.toLowerCase().includes(needle) || c.slug.includes(needle)) &&
      (!repeat || (repeat === "yes" ? !!c.default_recurrence_months : !c.default_recurrence_months)),
  );
  const history = new Map<string, { version: number; notes: string | null; published_at: string }[]>();
  for (const v of versions.error ? [] : versions.data ?? []) history.set(v.course_id, [...(history.get(v.course_id) ?? []), v]);
  const perVersion = new Map<string, number>();
  for (const r of done ?? []) perVersion.set(`${r.course_id}|${r.course_version}`, (perVersion.get(`${r.course_id}|${r.course_version}`) ?? 0) + 1);
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
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6">
          <h2 className="text-3xl">Courses <span className="text-muted">({courses.length})</span></h2>
          <form className="flex flex-wrap items-end gap-2">
            <input name="q" defaultValue={q} placeholder="Search courses" className="field !min-h-[40px] !py-1.5" />
            <select name="repeat" defaultValue={repeat ?? ""} className="field !min-h-[40px] !py-1.5">
              <option value="">All courses</option>
              <option value="yes">Repeats</option>
              <option value="no">Taken once</option>
            </select>
            <button className="btn btn-ghost btn-sm">Show</button>
          </form>
        </div>
        <p className="max-w-3xl px-6 pt-2 text-sm text-muted">
          <b>Retraining</b> is the default for every client; their managers can change it for their own team. Most courses
          are taken once. <b>Versions:</b> when a course file changes after real learners have finished it, the next deploy
          saves it as a new version and keeps the old one here. Past finishes and certificates stay, and still count toward
          retraining dates.
        </p>
        <table className="mt-4 w-full min-w-[900px] text-left">
          <thead className="label border-y border-line text-muted"><tr><th className="px-6 py-3">Course</th><th className="px-4 py-3">Retraining</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Finishes</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {courses.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-6 py-3"><span className="font-medium">{c.title}</span><span className="block text-sm text-muted">{c.slug}{c.minutes ? ` · ${c.minutes} min` : ""}</span></td>
                <td className="px-4 py-3">
                  <RepeatPicker
                    action={saveCourseDefault}
                    hidden={{ courseId: c.id }}
                    value={c.default_recurrence_months ? String(c.default_recurrence_months) : "never"}
                    label={`Retraining for ${c.title}`}
                  />
                  {c.recurrence_note && <span className="mt-1 block max-w-[260px] text-sm text-muted">{c.recurrence_note}</span>}
                </td>
                <td className="px-4 py-3">
                  {(history.get(c.id)?.length ?? 0) > 1 ? (
                    <details>
                      <summary className="cursor-pointer">v{c.version} <span className="text-sm text-muted">({history.get(c.id)!.length} versions)</span></summary>
                      <ul className="mt-2 flex flex-col gap-1 text-sm">
                        {history.get(c.id)!.map((v) => (
                          <li key={v.version}>
                            <a href={`/admin/owner/library/file?course=${c.id}&v=${v.version}`} target="_blank" rel="noreferrer">v{v.version}</a>
                            {" · "}{fmtDate(v.published_at)} · {perVersion.get(`${c.id}|${v.version}`) ?? 0} finishes
                            {v.notes && <span className="block text-muted">{v.notes}</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <>v{c.version}</>
                  )}
                </td>
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
