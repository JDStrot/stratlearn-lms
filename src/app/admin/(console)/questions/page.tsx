import Link from "next/link";
import { inScope, requireStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LocalDate } from "@/components/local-date";
import { AnswerForm } from "@/components/answer-form";
import { TOPIC_LABEL, addBusinessDays, loadTrainers, type Topic } from "@/lib/trainer";
import { answerQuestion } from "../../trainer-actions";
import { PageHead } from "../../ui";

type Row = {
  id: string;
  created_at: string;
  topic: Topic;
  question: string;
  lang: string;
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
  sent_to: { name?: string; email?: string | null } | null;
  learner_id: string;
  learners: { display_name: string; location_id: string | null } | null;
  courses: { title: string } | null;
};

/** Workers' questions from Ask a trainer, newest first. Open ones on top. */
export default async function Questions({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const s = await requireStaff();
  const { show } = await searchParams;
  const all = show === "all";
  const trainers = await loadTrainers(s.org.id);
  let q = supabaseAdmin()
    .from("trainer_questions")
    .select("id, created_at, topic, question, lang, answer, answered_at, answered_by, sent_to, learner_id, learners(display_name, location_id), courses(title)")
    .eq("org_id", s.org.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!all) q = q.eq("status", "open");
  const { data, error } = trainers.ready ? await q : { data: [], error: null };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => inScope(s, r.learners?.location_id ?? null));
  const now = Date.now();

  return (
    <>
      <PageHead eyebrow="✦ Ask a trainer" title={<>Questions</>}>
        <Link href="/admin/questions" className={`btn btn-sm ${all ? "btn-ghost" : "btn-primary"}`}>Waiting</Link>
        <Link href="/admin/questions?show=all" className={`btn btn-sm ${all ? "btn-primary" : "btn-ghost"}`}>All</Link>
      </PageHead>
      {!trainers.ready ? (
        <p role="alert" className="mb-6 rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          Questions need the Ask a trainer database update first.
        </p>
      ) : (
        !trainers.safety &&
        !trainers.hr && (
          <p className="mb-6 rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            No trainer is set up, so questions only come here. <Link href="/admin/settings/trainers">Add your trainers</Link>.
          </p>
        )
      )}
      {error && <p className="mb-6 text-error">{error.message}</p>}
      {rows.length === 0 && trainers.ready && (
        <p className="card p-6 text-muted">{all ? "No questions yet." : "Nothing waiting. Every question has an answer."}</p>
      )}
      <ul className="grid gap-4">
        {rows.map((r) => {
          const dueBy = addBusinessDays(new Date(r.created_at), 2);
          const late = !r.answer && dueBy.getTime() < now;
          return (
            <li key={r.id} className="card p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                <Link href={`/admin/people/${r.learner_id}`} className="font-medium text-ink">{r.learners?.display_name ?? "Someone"}</Link>
                <span>· {r.courses?.title ?? "Course"}</span>
                <span>· <LocalDate iso={r.created_at} time /></span>
                {r.lang === "es" && <span className="chip">Spanish</span>}
                <span className="chip">{TOPIC_LABEL[r.topic]}</span>
                {r.answer ? (
                  <span className="chip border-success/40 bg-success/10 text-success">Answered</span>
                ) : late ? (
                  <span className="chip border-error/40 bg-error/10 text-error">Past 2 business days</span>
                ) : (
                  <span className="chip">Answer by <LocalDate iso={dueBy.toISOString()} /></span>
                )}
              </div>
              <p className="mb-4 whitespace-pre-wrap text-lg">{r.question}</p>
              {r.answer ? (
                <div className="rounded-[12px] bg-mist/60 p-4">
                  <p className="label text-plum">
                    {r.answered_by} · {r.answered_at && <LocalDate iso={r.answered_at} time />}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{r.answer}</p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted">
                    {r.sent_to?.email ? `Sent to ${r.sent_to.name} (${r.sent_to.email}). You can answer here too.` : "No trainer email was set, so it only came here."}
                  </p>
                  <AnswerForm action={answerQuestion} hidden={{ id: r.id }} />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
