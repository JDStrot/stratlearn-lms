import Link from "next/link";
import { assignedCourses, requireLearner } from "@/lib/learner";
import { logout } from "../actions";

export default async function LearnPage() {
  const learner = await requireLearner();
  const items = await assignedCourses(learner);
  const es = learner.preferred_language === "es";
  const todo = items.filter((i) => !i.completedAt);
  const done = items.filter((i) => i.completedAt);

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
          {done.map(({ course }) => (
            <Link
              key={course.id}
              href={`/play/${course.slug}`}
              className="flex items-center justify-between rounded-2xl bg-card/70 p-4"
            >
              <span>{(es && course.title_es) || course.title}</span>
              <span aria-label="done">✅</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
