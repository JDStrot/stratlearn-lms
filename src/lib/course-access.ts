import "server-only";
import { assignedCourses, type Learner } from "./learner";

/** Returns the course if it is published and assigned to this learner. */
export async function assignedCourseBySlug(learner: Learner, slug: string) {
  const items = await assignedCourses(learner);
  return items.find((i) => i.course.slug === slug)?.course ?? null;
}
