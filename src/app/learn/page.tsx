import { assignedCourses, requireLearner } from "@/lib/learner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { logout } from "../actions";
import { LearnView } from "./learn-view";

export default async function LearnPage() {
  const learner = await requireLearner();
  const items = await assignedCourses(learner);
  const es = learner.preferred_language === "es";

  // Newest certificate per finished course, for the "Certificate" link.
  const { data: certs } = await supabaseAdmin()
    .from("certificates")
    .select("course_id, verify_code, issued_at")
    .eq("learner_id", learner.id)
    .order("issued_at", { ascending: false });
  const certByCourse: Record<string, string> = {};
  for (const c of certs ?? []) certByCourse[c.course_id] ??= c.verify_code;

  return (
    <>
      <SiteHeader
        signOut={
          <form action={logout}>
            <button className="btn btn-ghost btn-sm">{es ? "Salir" : "Sign out"}</button>
          </form>
        }
      />
      <LearnView name={learner.display_name} es={es} items={items} certByCourse={certByCourse} />
      <SiteFooter />
    </>
  );
}
