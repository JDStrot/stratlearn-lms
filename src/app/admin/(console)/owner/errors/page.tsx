import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner } from "../../../owner-actions";
import { PageHead } from "../../../ui";

export const metadata = { title: "STRATLEARN · Errors" };

const SOURCE: Record<string, string> = {
  server: "Page or action",
  browser: "Someone's screen",
  course: "Course file",
  cron: "Daily job",
};

type Row = { id: string; created_at: string; source: string; signature: string; message: string; path: string | null; details: Record<string, unknown> | null; alerted: boolean };

/** Errors the app caught in the last 14 days, grouped by kind. */
export default async function Errors() {
  await requireOwner();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("app_errors")
    .select("id, created_at, source, signature, message, path, details, alerted")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  const groups = new Map<string, { first: Row; count: number; last: string }>();
  for (const r of (data ?? []) as Row[]) {
    const g = groups.get(r.signature);
    if (g) g.count++;
    else groups.set(r.signature, { first: r, count: 1, last: r.created_at });
  }
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <PageHead eyebrow="★ STRATLEARN owner portal" title={<>Error <em>alerts</em></>}>
        <Link href="/admin/owner" className="btn btn-ghost btn-sm">All clients</Link>
      </PageHead>
      <p className="mb-6 max-w-2xl text-muted">
        Everything the app caught going wrong in the last 14 days. You get an email the first time each kind of error shows up in
        an hour (at most 20 a day). Times are Pacific.
      </p>
      {error ? (
        <p className="card p-6">The errors table isn&apos;t set up yet. Run the app_errors database update in Supabase.</p>
      ) : groups.size === 0 ? (
        <p className="card p-6">No errors in the last 14 days. 🎉</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...groups.values()].map(({ first: r, count, last }) => (
            <li key={r.signature} className="card p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="chip">{SOURCE[r.source] ?? r.source}</span>
                <span className="text-muted">{count === 1 ? "Once" : `${count} times`} · last {fmt(last)}</span>
                {r.path && <code className="text-muted">{r.path}</code>}
              </div>
              <p className="mt-2 break-words font-medium text-ink">{r.message}</p>
              {r.details && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-violet">Details</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted">{JSON.stringify(r.details, null, 2)}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
