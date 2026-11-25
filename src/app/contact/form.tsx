"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sendFeedback, type ContactState } from "./actions";

export type CourseOption = { id: string; slug: string; title: string };
type Kind = "feedback" | "idea" | "course_issue" | "other";

export function ContactForm({
  es,
  mine,
  all,
  presetCourse,
  presetKind,
  name,
}: {
  es: boolean;
  mine: CourseOption[];
  all: CourseOption[];
  presetCourse: string;
  presetKind?: Kind;
  name: string;
}) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendFeedback, {});
  const [kind, setKind] = useState<Kind>(presetKind ?? "feedback");

  if (state.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <p className="text-2xl text-plum">{es ? "¡Gracias! Recibimos tu mensaje." : "Thank you! We got your message."}</p>
        <p className="text-muted">
          {es ? "Si nos dejaste cómo contactarte, te responderemos pronto." : "If you left a way to reach you, we'll get back to you soon."}
        </p>
        <Link href="/" className="btn btn-primary btn-sm">{es ? "Listo" : "Done"}</Link>
      </div>
    );
  }

  const kinds: [Kind, string][] = es
    ? [["feedback", "Opinión"], ["idea", "Idea para mejorar"], ["course_issue", "Problema en un curso"], ["other", "Otra cosa"]]
    : [["feedback", "Feedback"], ["idea", "Idea to improve"], ["course_issue", "Problem in a course"], ["other", "Something else"]];
  const mineIds = new Set(mine.map((c) => c.id));
  const rest = all.filter((c) => !mineIds.has(c.id));

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="lang" value={es ? "es" : "en"} />
      <input type="hidden" name="kind" value={kind} />
      {/* Bots fill this in; people never see it. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <fieldset>
        <legend className="label mb-2 text-plum">{es ? "¿Sobre qué es?" : "What's it about?"}</legend>
        <div className="grid grid-cols-2 gap-2">
          {kinds.map(([id, text]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              className={`min-h-[48px] rounded-full border px-3 text-[0.95rem] transition ${
                kind === id ? "border-plum bg-plum text-white" : "border-line bg-white text-plum hover:bg-mist"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="label text-plum">
          {es ? "Curso" : "Course"} <span className="font-normal normal-case text-muted">({es ? "opcional" : "optional"})</span>
        </span>
        <select name="courseId" defaultValue={presetCourse} className="field">
          <option value="">{es ? "No es sobre un curso" : "Not about a course"}</option>
          {mine.length > 0 && (
            <optgroup label={es ? "Mis cursos" : "My courses"}>
              {mine.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </optgroup>
          )}
          {rest.length > 0 && (
            <optgroup label={mine.length ? (es ? "Todos los cursos" : "All courses") : (es ? "Cursos" : "Courses")}>
              {rest.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </optgroup>
          )}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label text-plum">{es ? "Tu mensaje" : "Your message"}</span>
        <textarea
          name="message"
          required
          maxLength={4000}
          rows={5}
          className="field !min-h-[140px]"
          placeholder={
            kind === "course_issue"
              ? es ? "¿Qué pasó? ¿En qué parte del curso?" : "What happened? Which part of the course?"
              : kind === "idea"
                ? es ? "¿Qué haría esto mejor para ti?" : "What would make this better for you?"
                : es ? "Escribe aquí" : "Type here"
          }
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">
            {es ? "Nombre" : "Name"} <span className="font-normal normal-case text-muted">({es ? "opcional" : "optional"})</span>
          </span>
          <input name="name" defaultValue={name} maxLength={120} autoComplete="name" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label text-plum">
            {es ? "Email o teléfono" : "Email or phone"} <span className="font-normal normal-case text-muted">({es ? "opcional" : "optional"})</span>
          </span>
          <input name="contact" maxLength={200} autoComplete="email" className="field" />
        </label>
      </div>
      <p className="-mt-2 text-sm text-muted">
        {es ? "Déjalo si quieres que te respondamos." : "Leave this if you'd like a reply."}
      </p>

      {state.error && (
        <p role="alert" className="rounded-[10px] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{state.error}</p>
      )}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? (es ? "Enviando…" : "Sending…") : es ? "Enviar" : "Send"}
      </button>
    </form>
  );
}
