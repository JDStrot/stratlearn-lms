import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOwner, setFeedbackStatus } from "../../../owner-actions";
import { fmtDate } from "../../../data";
import { PageHead } from "../../../ui";

export const metadata = { title: "STRATLEARN · Feedback" };

const KIND: Record<string, string> = {
  feedback: "Feedback",
  idea: "Idea",
  course_issue: "Course problem",
  other: "Other",
};

type Row = {
  id: string;
  created_at: string;
  kind: string;
  message: string;
  name: string | null;
  contact: string | null;
  page: string | null;
  status: "new" | "done";
  courses: { title: string; slug: string } | null;
  organizations: { name: string } | null;
  learners: { display_name: string; username: string } | null;
};

/** Contact Us messages from learners, managers and visitors. */
export default async function Feedback({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireOwner();
  const show = (await searchParams).show === "done" ? "done" : (await searchParams).show === "all" ? "all" : "new";
  let q = supabaseAdmin()
    .from("feedback_messages")
    .select("id, created_at, kind, message, name, contact, page, status, courses(title, slug), organizations(name), learners(display_name, username)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (show !== "all") q = q.eq("status", show);
  const { data, error } = await q;
  const rows = (data ?? []) as unknown as Row[];

  const tab = (id: string, text: string) => (
    <Link
      href={id === "new" ? "/admin/owner/feedback" : `/admin/owner/feedback?show=${id}`}
      aria-current={show === id ? "page" : undefined}
      className={`inline-flex min-h-[40px] items-center rounded-full px-4 no-underline ${show === id ? "bg-plum text-white" : "text-plum hover:bg-mist"}`}
    >
      {text}
    </Link>
  );

  return (
    <>
      <p className="mb-2"><Link href="/admin/owner" className="label">← All clients</Link></p>
      <PageHead eyebrow="★ Owner portal" title={<>Contact us <em>messages</em></>} />
      <nav aria-label="Filter" className="label mb-6 flex gap-1">
        {tab("new", "New")}
        {tab("done", "Handled")}
        {tab("all", "All")}
      </nav>

      {error ? (
        <p className="card p-6 text-muted">
          Messages will show here once the Contact Us database update has been run in Supabase.
        </p>
      ) : rows.length === 0 ? (
        <p className="card p-6 text-muted">{show === "new" ? "No new messages. You're all caught up." : "No messages here yet."}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.id} className="card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`chip ${r.kind === "course_issue" ? "!bg-error/10 !text-error" : ""}`}>{KIND[r.kind] ?? r.kind}</span>
                {r.courses && <span className="chip">{r.courses.title}</span>}
                <span className="text-muted">{fmtDate(r.created_at)}</span>
                {r.status === "done" && <span className="text-muted">· Handled</span>}
              </div>
              <p className="whitespace-pre-wrap text-ink">{r.message}</p>
              <p className="text-sm text-muted">
                From {r.name || r.learners?.display_name || "someone not signed in"}
                {r.learners && ` (${r.learners.username})`}
                {r.organizations && ` · ${r.organizations.name}`}
                {r.contact && <> · Reply to: <span className="text-ink">{r.contact}</span></>}
              </p>
              <form action={setFeedbackStatus}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value={r.status === "new" ? "done" : "new"} />
                <button className="btn btn-ghost btn-sm">{r.status === "new" ? "Mark handled" : "Move back to new"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
