import Link from "next/link";
import type { Course } from "@/lib/learner";

export type LearnItem = { course: Course; dueAt: string | null; completedAt: string | null };

/** Learner home: greeting band with progress, then courses to do and finished. */
export function LearnView({ name, es, items }: { name: string; es: boolean; items: LearnItem[] }) {
  const todo = items.filter((i) => !i.completedAt);
  const done = items.filter((i) => i.completedAt);
  const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;
  const title = (c: Course) => (es && c.title_es) || c.title;
  const date = (d: string) => new Date(d).toLocaleDateString(es ? "es" : "en", { month: "short", day: "numeric" });

  return (
    <main id="main" className="flex-1">
      <section className="on-dark">
        <div className="wrap flex flex-col gap-6 py-12 lg:flex-row lg:items-end lg:justify-between lg:py-16">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">✦ {es ? "Mi aprendizaje" : "My learning"}</p>
            <h1 className="text-[2.6rem] sm:text-6xl">
              {es ? "Hola, " : "Hi, "}
              <em>{name}</em>.
            </h1>
            <p className="text-lg">
              {todo.length === 0
                ? es
                  ? "¡Todo listo! Buen trabajo."
                  : "You're all caught up. Nice work."
                : es
                  ? `Tienes ${todo.length} ${todo.length === 1 ? "curso" : "cursos"} por hacer.`
                  : `You have ${todo.length} ${todo.length === 1 ? "course" : "courses"} to do.`}
            </p>
          </div>
          {items.length > 0 && (
            <div className="w-full max-w-sm">
              <div className="label mb-2 flex justify-between text-[#efe7ff]">
                <span>{es ? "Progreso" : "Progress"}</span>
                <span>
                  {done.length} / {items.length}
                </span>
              </div>
              <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white">
        <div className="wrap flex flex-col gap-6 py-12 lg:py-16">
          <div>
            <p className="eyebrow">{es ? "Por hacer" : "Up next"}</p>
            <h2 className="mt-2 text-4xl">
              {es ? (
                <>
                  Tus <em>cursos</em>
                </>
              ) : (
                <>
                  Your <em>courses</em>
                </>
              )}
            </h2>
          </div>
          {todo.length === 0 ? (
            <p className="card bg-mist p-6 text-muted">
              {es ? "No tienes cursos pendientes ahora." : "Nothing to do right now. New courses will show up here."}
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todo.map(({ course, dueAt }) => (
                <li key={course.id}>
                  <Link
                    href={`/play/${course.slug}`}
                    className="card card-hover flex h-full flex-col gap-4 p-6 text-ink no-underline"
                  >
                    <div className="flex flex-wrap gap-2">
                      {course.minutes ? <span className="chip">{course.minutes} min</span> : null}
                      {dueAt ? (
                        <span className="chip">
                          {es ? "Vence" : "Due"} {date(dueAt)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-[1.7rem]">{title(course)}</h3>
                    <span className="btn btn-primary btn-sm mt-auto self-start">{es ? "Empezar" : "Start"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {done.length > 0 && (
        <section className="bg-mist">
          <div className="wrap flex flex-col gap-6 py-12 lg:py-16">
            <div>
              <p className="eyebrow">{es ? "Logros" : "Achievements"}</p>
              <h2 className="mt-2 text-4xl">
                {es ? (
                  <>
                    Ya <em>terminados</em>
                  </>
                ) : (
                  <>
                    Already <em>finished</em>
                  </>
                )}
              </h2>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              {done.map(({ course, completedAt }) => (
                <li key={course.id}>
                  <Link
                    href={`/play/${course.slug}`}
                    className="card card-hover flex items-center gap-4 p-5 text-ink no-underline"
                  >
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-plum text-xl text-lilac">
                      ✦
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">{title(course)}</span>
                      {completedAt && (
                        <span className="text-sm text-muted">
                          {es ? "Terminado" : "Finished"} {date(completedAt)}
                        </span>
                      )}
                    </span>
                    <span className="label text-violet">{es ? "Repasar" : "Review"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
