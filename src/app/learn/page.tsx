import { assignedCourses, requireLearner } from "@/lib/learner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { logout } from "../actions";
import { LearnView } from "./learn-view";

export default async function LearnPage() {
  const learner = await requireLearner();
  const items = await assignedCourses(learner);
  const es = learner.preferred_language === "es";

  return (
    <>
      <SiteHeader
        signOut={
          <form action={logout}>
            <button className="btn btn-ghost btn-sm">{es ? "Salir" : "Sign out"}</button>
          </form>
        }
      />
      <LearnView name={learner.display_name} es={es} items={items} />
      <SiteFooter />
    </>
  );
}
