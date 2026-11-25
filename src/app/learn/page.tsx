import { assignedCourses, requireLearner } from "@/lib/learner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { logout } from "../actions";
import { LearnView } from "./learn-view";
import { IdleSignOut } from "./kiosk";
import { readSession } from "@/lib/session";
import Link from "next/link";

export default async function LearnPage() {
  const learner = await requireLearner();
  const items = await assignedCourses(learner);
  const es = learner.preferred_language === "es";
  const kiosk = !!(await readSession())?.kiosk;

  // Newest certificate per finished course, for the "Certificate" link.
  const { data: certs } = await supabaseAdmin()
    .from("certificates")
    .select("course_id, verify_code, issued_at")
    .eq("learner_id", learner.id)
    .order("issued_at", { ascending: false });
  const certByCourse: Record<string, string> = {};
  for (const c of certs ?? []) certByCourse[c.course_id] ??= c.verify_code;

  // The team's own policies and plans: the library ones, plus any tied to their courses.
  const mine = new Set(items.map((i) => i.course.id));
  const { data: docRows } = await supabaseAdmin()
    .from("org_documents")
    .select("id, title, course_id")
    .eq("org_id", learner.org_id)
    .eq("visible_to_learners", true)
    .order("title");
  const docs = (docRows ?? []).filter((d) => !d.course_id || mine.has(d.course_id));
  const courseTitle = new Map(items.map((i) => [i.course.id, (es && i.course.title_es) || i.course.title]));

  return (
    <>
      <SiteHeader
        signOut={
          kiosk ? (
            <form action="/tablet/done" method="post">
              <button className="btn btn-primary btn-sm">{es ? "Terminé" : "I'm done"}</button>
            </form>
          ) : (
            <span className="flex items-center gap-2">
              <Link href="/learn/account" className="btn btn-ghost btn-sm">
                {es ? "Mi acceso" : "My sign-in"}
              </Link>
              <form action={logout}>
                <button className="btn btn-ghost btn-sm">{es ? "Salir" : "Sign out"}</button>
              </form>
            </span>
          )
        }
      />
      {kiosk && <IdleSignOut />}
      <LearnView name={learner.display_name} es={es} items={items} certByCourse={certByCourse} />
      {docs.length > 0 && (
        <section className="wrap pb-12">
          <h2 className="mb-4 text-3xl">{es ? "Planes y políticas de tu empresa" : "Your company's plans and policies"}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {docs.map((d) => (
              <li key={d.id}>
                <a href={`/files/${d.id}`} target="_blank" rel="noreferrer" className="card card-hover flex flex-col gap-1 p-4 no-underline">
                  <span className="font-medium text-ink">{d.title}</span>
                  {d.course_id && <span className="text-sm text-muted">{es ? "Para" : "For"} {courseTitle.get(d.course_id)}</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <SiteFooter />
    </>
  );
}
