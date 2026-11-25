import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import type { QuizSettings } from "./org-settings";

/**
 * Failed tries on a course in the current round. A round starts at the later
 * of the last finish, a manager's "take it again", or a manager giving more
 * tries. Passes are completions, so they aren't counted here.
 */
export async function attemptState(
  learnerId: string,
  courseId: string,
  roundStart: string | null,
  quiz: QuizSettings,
) {
  const { data, error } = await supabaseAdmin()
    .from("course_attempts")
    .select("kind, created_at")
    .eq("learner_id", learnerId)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = error ? [] : (data ?? []);
  const lastReset = rows.find((r) => r.kind === "reset")?.created_at ?? null;
  const since = [roundStart, lastReset].filter(Boolean).sort().pop() ?? null;
  const failures = rows.filter((r) => r.kind === "attempt" && (!since || r.created_at > since)).length;
  const locked = quiz.max_attempts != null && failures >= quiz.max_attempts;
  const triesLeft = quiz.max_attempts == null ? null : Math.max(0, quiz.max_attempts - failures);
  return { failures, locked, triesLeft };
}

/** Start of this round from what the learner list knows. */
export function roundStartOf(lastFinishedAt: string | null, retakeAfter: string | null, completedAt: string | null) {
  if (completedAt) return completedAt;
  return [lastFinishedAt, retakeAfter].filter(Boolean).sort().pop() ?? null;
}
