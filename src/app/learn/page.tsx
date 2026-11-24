import Link from "next/link";
import { assignedCourses, requireLearner } from "@/lib/learner";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logout } from "../actions";

export default async function LearnPage() {
  const learner = await requireLearner();
  const items = await assignedCourses(learner);
  const es = learner.preferred_language === "es";
  const todo = items.filter((i) => !i.completedAt);
  const done = items.filter((i) => i.completedAt);

  // Newest certificate per finished course, for the "Certificate" link.
  const { data: certs } = await supabaseAdmin()
    .from("certificates")
    .select("course_id, verify_code, issued_at")
    .eq("learner_id", learner.id)
    .order("issued_at", { ascending: false });
  const certByCourse = new Map<string, string>();
  for (const c of certs ?? []) if (!certByCourse.has(c.course_id)) certByCourse.set(c.course_id, c.verify_code);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{es ? "Hola" : "Hi"},</p>
          <h1 className="text-2xl font-extrabold">{learner.display_name}</h1>
        </div>
        <form action={logout}>
          <button className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-pink-50">
            {es ? "Salir" : "Sign out"}
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{es ? "Tus cursos" : "Your courses"}</h2>
        {todo.length === 0 && (
          <p className="rounded-2xl bg-card p-5 text-muted">
            {es ? "¡Todo listo! No tienes cursos pendientes." : "All caught up! Nothing to do right now."}
          </p>
        )}
        {todo.map(({ course, dueAt }) => (
          <Link
            key={course.id}
            href={`/play/${course.slug}`}
            className="flex items-center justify-between gap-4 rounded-2xl bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <div>
              <p className="font-bold">{(es && course.title_es) || course.title}</p>
              <p className="text-sm text-muted">
                {course.minutes ? `${course.minutes} min` : ""}
                {dueAt ? ` · ${es ? "Vence" : "Due"} ${new Date(dueAt).toLocaleDateString(es ? "es" : "en")}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white">
              {es ? "Empezar" : "Start"}
            </span>
          </Link>
        ))}
      </section>

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{es ? "Terminados" : "Finished"}</h2>
          {done.map(({ course }) => {
            const code = certByCourse.get(course.id);
            return (
              <div key={course.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card/70 p-4">
                <Link href={`/play/${course.slug}`} className="flex-1 hover:underline">
                  ✅ {(es && course.title_es) || course.title}
                </Link>
                {code && (
                  <Link
                    href={`/verify/${code}`}
                    className="rounded-full border border-pink-200 px-3 py-1 text-sm font-semibold text-brand hover:bg-pink-50"
                  >
                    {es ? "Certificado" : "Certificate"}
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
