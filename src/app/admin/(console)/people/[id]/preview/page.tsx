import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff";
import { assignedCourses, type Learner } from "@/lib/learner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LearnView } from "@/app/learn/learn-view";

/** "View as" a worker: their home screen exactly as they see it, read-only. */
export default async function PreviewAs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireStaff();
  const db = supabaseAdmin();
  const { data } = await db
    .from("learners")
    .select("id, org_id, display_name, preferred_language, job_role_id, location_id, start_date, created_at")
    .eq("id", id)
    .eq("org_id", s.org.id)
    .maybeSingle();
  if (!data) notFound();
  const learner = data as Learner;
  const items = await assignedCourses(learner);
  const { data: certs } = await db
    .from("certificates")
    .select("course_id, verify_code")
    .eq("learner_id", id)
    .order("issued_at", { ascending: false });
  const certByCourse: Record<string, string> = {};
  for (const c of certs ?? []) certByCourse[c.course_id] ??= c.verify_code;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-lilac bg-mist px-5 py-4">
        <p>
          <b className="text-plum">Viewing as {learner.display_name}.</b>{" "}
          <span className="text-muted">This is their screen. Nothing you do here is saved to their record.</span>
        </p>
        <Link href={`/admin/people/${id}`} className="btn btn-primary btn-sm">Back to {learner.display_name.split(" ")[0]}</Link>
      </div>
      <div className="overflow-hidden rounded-[18px] border border-line">
        <LearnView name={learner.display_name} es={learner.preferred_language === "es"} items={items} certByCourse={certByCourse} preview />
      </div>
    </>
  );
}
