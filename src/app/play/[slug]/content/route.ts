import { NextResponse, type NextRequest } from "next/server";
import { assignedCourses, requireLearner } from "@/lib/learner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { courseHook } from "@/lib/course-hook";

/**
 * Serves a course's HTML file from the private "courses" storage bucket.
 * Going through the app (instead of a public link) keeps courses behind login
 * and lets the course run on the same site as the player. A small script is
 * added to the top of the file so the course saves progress per learner and
 * reports completion (see course-hook.ts).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const learner = await requireLearner();
  const item = (await assignedCourses(learner)).find((i) => i.course.slug === slug);
  if (!item?.course.storage_path) return new NextResponse("Course not found", { status: 404 });

  const { course } = item;
  const { data, error } = await supabaseAdmin().storage.from("courses").download(item.course.storage_path);
  if (error || !data) {
    console.error("course download failed", course.storage_path, error);
    return new NextResponse("Course file missing", { status: 404 });
  }

  const hook = courseHook({
    learnerId: learner.id,
    slug: course.slug,
    courseVersion: course.version,
    completed: Boolean(item.completedAt),
    round: item.completedAt ? "" : roundKey(item.lastFinishedAt, item.retakeAfter),
  });
  const html = hook + (await data.text());

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-frame-options": "SAMEORIGIN",
    },
  });
}

/** Start of this retraining round: the later of the last finish and a retake request. */
function roundKey(lastFinishedAt: string | null, retakeAfter: string | null) {
  const t = Math.max(lastFinishedAt ? Date.parse(lastFinishedAt) : 0, retakeAfter ? Date.parse(retakeAfter) : 0);
  return t ? String(t) : "";
}
