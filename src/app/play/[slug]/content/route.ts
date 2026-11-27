import { NextResponse, type NextRequest } from "next/server";
import { assignedCourses, requireLearner } from "@/lib/learner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { courseHook } from "@/lib/course-hook";
import { attemptState, roundStartOf } from "@/lib/attempts";
import { loadOrgSettings } from "@/lib/org-settings";
import { topicOf } from "@/lib/trainer";

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

  // Failed tries: each try starts fresh; after the last one, wait for a manager.
  let tries = 0;
  if (!item.completedAt) {
    const { quiz } = await loadOrgSettings(learner.org_id);
    if (quiz.pass_score != null || quiz.max_attempts != null) {
      const st = await attemptState(learner.id, course.id, roundStartOf(item.lastFinishedAt, item.retakeAfter, null), quiz);
      if (st.locked) return lockedPage(learner.preferred_language === "es");
      tries = st.failures;
    }
  }
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
    ask: !!topicOf(course.slug),
    round: item.completedAt ? "" : roundKey(item.lastFinishedAt, item.retakeAfter) + (tries ? `t${tries}` : ""),
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

function lockedPage(es: boolean) {
  const msg = es
    ? "Usaste todos tus intentos. Pide a tu gerente que te dé más intentos."
    : "You've used all your tries. Ask your manager to give you more tries.";
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:18px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;background:#f6f1fa;color:#400265;text-align:center"><p>${msg}</p></body>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } },
  );
}
