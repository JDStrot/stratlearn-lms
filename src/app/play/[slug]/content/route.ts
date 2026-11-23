import { NextResponse, type NextRequest } from "next/server";
import { requireLearner } from "@/lib/learner";
import { assignedCourseBySlug } from "@/lib/course-access";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Serves a course's HTML file from the private "courses" storage bucket.
 * Going through the app (instead of a public link) keeps courses behind login
 * and lets the course run on the same site as the player.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const learner = await requireLearner();
  const course = await assignedCourseBySlug(learner, slug);
  if (!course?.storage_path) return new NextResponse("Course not found", { status: 404 });

  const { data, error } = await supabaseAdmin().storage.from("courses").download(course.storage_path);
  if (error || !data) {
    console.error("course download failed", course.storage_path, error);
    return new NextResponse("Course file missing", { status: 404 });
  }

  return new NextResponse(data.stream(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, max-age=300",
      "x-frame-options": "SAMEORIGIN",
    },
  });
}
