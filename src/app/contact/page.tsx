import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { readSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assignedCourses, type Learner } from "@/lib/learner";
import { ContactForm, type CourseOption } from "./form";

export const metadata = { title: "STRATLEARN · Contact us" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ course?: string; kind?: string }> }) {
  const { course, kind } = await searchParams;
  const db = supabaseAdmin();
  const session = await readSession();

  let learner: Learner | null = null;
  if (session) {
    const { data } = await db
      .from("learners")
      .select("id, org_id, display_name, preferred_language, job_role_id, location_id, start_date, created_at")
      .eq("id", session.lid)
      .eq("is_active", true)
      .maybeSingle();
    learner = (data as Learner | null) ?? null;
  }
  const es = learner?.preferred_language === "es";

  const { data: rows } = await db.from("courses").select("id, slug, title, title_es").eq("is_published", true).order("title");
  const name = (c: { title: string; title_es: string | null }) => (es && c.title_es) || c.title;
  const all: CourseOption[] = (rows ?? []).map((c) => ({ id: c.id, slug: c.slug, title: name(c) }));
  let mine: CourseOption[] = [];
  if (learner) {
    try {
      mine = (await assignedCourses(learner)).map((i) => ({ id: i.course.id, slug: i.course.slug, title: (es && i.course.title_es) || i.course.title }));
    } catch {
      mine = [];
    }
  }
  const preset = all.find((c) => c.slug === course)?.id ?? "";

  return (
    <>
      <SiteHeader es={es} />
      <main id="main" className="on-dark flex-1">
        <div className="wrap grid items-start gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-5">
            <p className="eyebrow">✦ {es ? "Contáctanos" : "Contact us"}</p>
            <h1 className="text-[2.6rem] sm:text-6xl">
              {es ? <>Ayúdanos a <em>mejorar</em>.</> : <>Help us make it <em>better</em>.</>}
            </h1>
            <p className="max-w-md text-lg">
              {es
                ? "Cuéntanos qué te gusta, qué podemos mejorar, o si algo no funciona en un curso. Leemos cada mensaje."
                : "Tell us what you like, what we could do better, or if something in a course isn't working. We read every message."}
            </p>
          </div>
          <section aria-labelledby="contact-title" className="card p-6 text-ink shadow-soft sm:p-9">
            <h2 id="contact-title" className="mb-6 text-[2.1rem] text-plum">
              {es ? <>Envía un <em className="text-violet">mensaje</em></> : <>Send us a <em className="text-violet">note</em></>}
            </h2>
            <ContactForm
              es={es}
              mine={mine}
              all={all}
              presetCourse={preset}
              presetKind={kind === "course_issue" || preset ? "course_issue" : undefined}
              name={learner?.display_name ?? ""}
            />
          </section>
        </div>
      </main>
      <SiteFooter es={es} />
    </>
  );
}
