import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner } from "../../../owner-actions";
import { fmtDate } from "../../../data";
import { PageHead } from "../../../ui";

/** Find any certificate by code or learner name, across every client. */
export default async function Certificates({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireOwner();
  const q = ((await searchParams).q ?? "").trim();
  type Row = { verify_code: string; issued_at: string; learners: { display_name: string } | null; courses: { title: string } | null; organizations: { name: string } | null };
  let rows: Row[] = [];
  if (q) {
    const db = supabaseAdmin();
    const sel = "verify_code, issued_at, learners!inner(display_name), courses(title), organizations(name)";
    const code = q.toUpperCase().replace(/[^A-F0-9]/g, "");
    const byCode = code.length >= 4 ? await db.from("certificates").select(sel).ilike("verify_code", `${code}%`).limit(50) : { data: [] };
    const byName = await db.from("certificates").select(sel).ilike("learners.display_name", `%${q.replace(/[%_]/g, "")}%`).order("issued_at", { ascending: false }).limit(100);
    const seen = new Set<string>();
    rows = [...((byCode.data ?? []) as unknown as Row[]), ...((byName.data ?? []) as unknown as Row[])].filter((r) => !seen.has(r.verify_code) && seen.add(r.verify_code));
  }
  return (
    <>
      <p className="mb-2"><Link href="/admin/owner" className="label">← All clients</Link></p>
      <PageHead eyebrow="★ Owner portal" title={<>Certificate <em>lookup</em></>} />
      <form className="mb-6 flex max-w-xl gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Certificate code or learner name" aria-label="Certificate code or learner name" className="field" />
        <button className="btn btn-primary btn-sm shrink-0">Find</button>
      </form>
      {q && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="label border-b border-line text-muted"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Learner</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Issued</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No certificates match.</td></tr>}
              {rows.map((r) => (
                <tr key={r.verify_code}>
                  <td className="px-4 py-3"><Link href={`/verify/${r.verify_code}`} className="font-mono">{r.verify_code}</Link></td>
                  <td className="px-4 py-3">{r.learners?.display_name}</td>
                  <td className="px-4 py-3">{r.courses?.title}</td>
                  <td className="px-4 py-3">{r.organizations?.name}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate(r.issued_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
