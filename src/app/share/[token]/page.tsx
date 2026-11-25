/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LocalDate } from "@/components/local-date";

/**
 * Public "I finished a course" card a learner can share: /share/<token>.
 * Shows only their first name, the course and the date. No scores.
 */
async function load(token: string) {
  const clean = token.toLowerCase().replace(/[^a-f0-9]/g, "");
  if (!clean) return null;
  const { data } = await supabaseAdmin()
    .from("learner_badges")
    .select("earned_at, learners(display_name), badges(courses(slug, title))")
    .eq("share_token", clean)
    .maybeSingle();
  if (!data) return null;
  const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));
  const badge = one(data.badges as unknown as { courses: unknown } | { courses: unknown }[]);
  const course = one(badge?.courses as { slug: string; title: string } | { slug: string; title: string }[] | undefined);
  if (!course) return null;
  const name = (one(data.learners as unknown as { display_name: string } | { display_name: string }[])?.display_name ?? "").trim().split(/\s+/)[0] || "Someone";
  return { name, course, earned: data.earned_at as string };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const d = await load((await params).token);
  if (!d) return { title: "Course finished" };
  const title = `${d.name} finished ${d.course.title}`;
  return {
    title,
    description: "Completed with STRATLEARN.",
    openGraph: { title, description: "Completed with STRATLEARN.", images: [`/course-art/${d.course.slug}.jpg`] },
    robots: { index: false },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const d = await load((await params).token);
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center bg-mist py-16">
        <section className="card mx-auto w-[calc(100%-32px)] max-w-md overflow-hidden text-center shadow-soft">
          {d ? (
            <>
              <img src={`/course-art/${d.course.slug}.jpg`} alt="" width={944} height={590} className="aspect-[16/10] w-full object-cover" />
              <div className="p-8">
                <p className="eyebrow">✦ Course complete</p>
                <h1 className="mt-3 text-3xl">
                  {d.name} finished <em>{d.course.title}</em>
                </h1>
                <p className="mt-3 text-muted">
                  <LocalDate iso={d.earned} />
                </p>
              </div>
            </>
          ) : (
            <div className="p-8">
              <h1 className="text-3xl">Link not found</h1>
              <p className="mt-2 text-muted">This share link doesn&apos;t work anymore.</p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
