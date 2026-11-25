import Link from "next/link";
import { canManageTeam, requireStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { removeDocument } from "../../../settings-actions";
import { fmtDate } from "../../../data";
import { PageHead } from "../../../ui";
import { UploadDocument } from "../client-forms";

/** The client's own policies and plans, e.g. the BBP exposure control plan. */
export default async function Documents() {
  const s = await requireStaff();
  const admin = canManageTeam(s);
  const db = supabaseAdmin();
  const [{ data: docs }, { data: courses }] = await Promise.all([
    db.from("org_documents").select("id, title, file_name, size_bytes, course_id, visible_to_learners, created_at").eq("org_id", s.org.id).order("created_at", { ascending: false }),
    db.from("courses").select("id, title").eq("is_published", true).order("title"),
  ]);
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));

  return (
    <>
      <p className="mb-2"><Link href="/admin/settings" className="label">← Team settings</Link></p>
      <PageHead eyebrow="✦ Team settings" title={<>Policies &amp; <em>plans</em></>} />
      <p className="mb-6 max-w-2xl text-muted">
        Some laws ask workers to see your own written plan, like a Bloodborne Pathogens Exposure Control Plan, an Emergency Action
        Plan, or a California Workplace Violence Prevention Plan. Upload it here and workers see it next to that course.
      </p>
      {admin && (
        <section className="card mb-6 p-6">
          <h2 className="mb-4 text-3xl">Upload</h2>
          <UploadDocument courses={courses ?? []} />
        </section>
      )}
      <section className="card p-6">
        <h2 className="mb-4 text-3xl">Your <em>documents</em></h2>
        <ul className="divide-y divide-line">
          {(docs ?? []).length === 0 && <li className="py-3 text-muted">None yet.</li>}
          {(docs ?? []).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                <a href={`/files/${d.id}`} target="_blank" rel="noreferrer" className="font-medium">{d.title}</a>
                <span className="block text-sm text-muted">
                  {d.course_id ? `With ${title.get(d.course_id) ?? "a course"}` : "Team library"} ·{" "}
                  {d.visible_to_learners ? "workers can see it" : "managers only"} · {fmtDate(d.created_at)}
                  {d.size_bytes ? ` · ${Math.max(1, Math.round(d.size_bytes / 1024))} KB` : ""}
                </span>
              </span>
              {admin && (
                <form action={removeDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="label text-error">Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
