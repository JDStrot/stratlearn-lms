import { supabaseAdmin } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnswerForm } from "@/components/answer-form";
import { loadTrainers, trainerFor, type Topic } from "@/lib/trainer";
import { answerByToken } from "./actions";

export const metadata = { title: "Answer a training question", robots: { index: false } };

/** Where a trainer lands from the question email: read it, answer it, no sign-in. */
export default async function AnswerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/[^a-f0-9]/g, "");
  const { data: q } = await supabaseAdmin()
    .from("trainer_questions")
    .select("created_at, question, lang, topic, answer, answered_by, org_id, learners(display_name), courses(title), organizations(name)")
    .eq("token", clean)
    .maybeSingle();
  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const trainer = q ? trainerFor(await loadTrainers(q.org_id), q.topic as Topic) : null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-mist py-12">
        <section className="card mx-auto w-[calc(100%-32px)] max-w-xl p-6 shadow-soft sm:p-8">
          {!q ? (
            <>
              <h1 className="text-3xl">This link doesn&apos;t <em>work</em></h1>
              <p className="mt-3 text-muted">It may be old or copied wrong. Check the Questions page in the console instead.</p>
            </>
          ) : (
            <>
              <p className="eyebrow">✦ Training question · {one(q.organizations)?.name}</p>
              <h1 className="mt-2 text-3xl">
                {one(q.learners)?.display_name} <em>asked</em>
              </h1>
              <p className="mt-1 text-sm text-muted">
                In {one(q.courses)?.title ?? "a course"} · {new Date(q.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                {q.lang === "es" ? " · asked in Spanish, so answer in Spanish if you can" : ""}
              </p>
              <blockquote className="my-5 whitespace-pre-wrap rounded-[12px] bg-mist/70 p-4 text-lg">{q.question}</blockquote>
              {q.answer ? (
                <>
                  <p className="label text-plum">Answered by {q.answered_by}</p>
                  <p className="mt-2 whitespace-pre-wrap">{q.answer}</p>
                </>
              ) : (
                <AnswerForm action={answerByToken} hidden={{ token: clean }} askBy defaultBy={trainer?.name ?? ""} />
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
