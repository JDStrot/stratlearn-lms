import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLearner } from "@/lib/learner";
import { assignedCourseBySlug } from "@/lib/course-access";
import { Logo } from "@/components/logo";
import { CoursePlayer } from "./player";

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const learner = await requireLearner();
  const course = await assignedCourseBySlug(learner, slug);
  if (!course) notFound();
  const es = learner.preferred_language === "es";

  return (
    <main id="main" className="flex h-dvh flex-col">
      <nav aria-label="Course" className="on-dark flex min-h-[56px] items-center gap-3 px-4">
        <Link href="/learn" className="label rounded-full px-3 py-3 no-underline hover:text-white">
          ← {es ? "Mis cursos" : "My courses"}
        </Link>
        <span className="min-w-0 flex-1 truncate text-center font-serif text-xl text-white">
          {(es && course.title_es) || course.title}
        </span>
        <span className="hidden w-[130px] overflow-hidden sm:block [&_img]:w-[130px]">
          <Logo tone="light" />
        </span>
      </nav>
      <CoursePlayer slug={course.slug} lang={learner.preferred_language} title={(es && course.title_es) || course.title} />
    </main>
  );
}
