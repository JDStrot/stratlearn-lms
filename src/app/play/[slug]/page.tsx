import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLearner } from "@/lib/learner";
import { assignedCourseBySlug } from "@/lib/course-access";
import { CoursePlayer } from "./player";

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const learner = await requireLearner();
  const course = await assignedCourseBySlug(learner, slug);
  if (!course) notFound();

  return (
    <main className="flex h-dvh flex-col">
      <nav className="flex items-center gap-3 border-b border-pink-100 bg-card px-4 py-2">
        <Link href="/learn" className="rounded-xl px-2 py-1 text-sm text-muted hover:bg-pink-50">
          ← {learner.preferred_language === "es" ? "Mis cursos" : "My courses"}
        </Link>
        <span className="truncate text-sm font-semibold">
          {(learner.preferred_language === "es" && course.title_es) || course.title}
        </span>
      </nav>
      <CoursePlayer slug={course.slug} lang={learner.preferred_language} />
    </main>
  );
}
