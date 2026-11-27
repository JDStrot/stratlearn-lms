"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Info = {
  ready: boolean;
  trainer: { name: string; title: string | null; qualifications: string | null; phone: string | null; hours: string | null; canEmail: boolean } | null;
  questions: { id: string; at: string; question: string; answer: string | null; answeredAt: string | null; by: string | null; isNew: boolean }[];
  newAnswers: number;
};

/**
 * "Ask a trainer" button in the course bar, and the question box it opens.
 * The course's own Ask a trainer button opens the same box (the course hook
 * sends "stratlearn:ask" and the player passes it on as a window event).
 */
export function AskTrainer({ slug, es }: { slug: string; es: boolean }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "too_many">("idle");
  const box = useRef<HTMLDialogElement>(null);

  const load = useCallback(
    async (seen: boolean) => {
      const r = await fetch(`/api/questions?slug=${encodeURIComponent(slug)}${seen ? "&seen=1" : ""}`).catch(() => null);
      if (r?.ok) setInfo(await r.json());
    },
    [slug],
  );

  useEffect(() => {
    void load(false);
    const onAsk = () => setOpen(true);
    window.addEventListener("stratlearn:ask", onAsk);
    return () => window.removeEventListener("stratlearn:ask", onAsk);
  }, [load]);

  useEffect(() => {
    const d = box.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal();
      void load(true);
    } else if (d.open) d.close();
  }, [open, load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return;
    setState("sending");
    const r = await fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, question: text, lang: es ? "es" : "en" }),
    }).catch(() => null);
    if (r?.status === 429) return setState("too_many");
    if (!r?.ok) return setState("error");
    setText("");
    setState("sent");
    void load(true);
  }

  const t = info?.trainer;
  const unread = info?.newAnswers ?? 0;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="label relative shrink-0 rounded-full border border-white/30 px-3 py-2 text-white hover:bg-white/10"
      >
        <span className="sm:hidden">{es ? "Preguntar" : "Ask"}</span>
        <span className="hidden sm:inline">{es ? "Preguntar a un capacitador" : "Ask a trainer"}</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-lilac text-[0.7rem] text-plum" aria-label={es ? "respuesta nueva" : "new answer"}>
            {unread}
          </span>
        )}
      </button>
      <dialog
        ref={box}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === box.current && setOpen(false)}
        aria-labelledby="ask-title"
        className="card m-auto w-[calc(100%-32px)] max-w-lg p-0 shadow-soft backdrop:bg-plum/40"
      >
        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">✦ {es ? "Preguntas" : "Questions"}</p>
              <h2 id="ask-title" className="mt-1 text-3xl">{es ? "Pregunta a un " : "Ask a "}<em>{es ? "capacitador" : "trainer"}</em></h2>
            </div>
            <button onClick={() => setOpen(false)} className="label rounded-full px-3 py-2" aria-label={es ? "Cerrar" : "Close"}>✕</button>
          </div>

          {!info ? (
            <p className="text-muted">…</p>
          ) : t ? (
            <div className="rounded-[12px] bg-mist/60 p-4 text-sm">
              <p className="font-medium text-ink">{t.name}{t.title ? `, ${t.title}` : ""}</p>
              {t.qualifications && <p className="text-muted">{t.qualifications}</p>}
              {(t.hours || t.phone) && <p className="mt-1 text-muted">{[t.hours, t.phone].filter(Boolean).join(" · ")}</p>}
              <p className="mt-2">
                {es
                  ? "Escribe tu pregunta sobre esta capacitación. Recibirás una respuesta en 2 días hábiles, aquí en el curso (y por correo si tienes uno)."
                  : "Ask anything about this training. You'll get an answer within 2 business days, right here in the course (and by email if you have one)."}
              </p>
            </div>
          ) : (
            <p className="rounded-[12px] bg-mist/60 p-4 text-sm">
              {es
                ? "Tu equipo aún no ha nombrado a un capacitador. Puedes escribir tu pregunta aquí y la verá tu gerente, o pregúntale a tu gerente o a Recursos Humanos. Deben darte una respuesta."
                : "Your team hasn't named a trainer yet. You can still write your question here and your manager will see it, or ask your manager or HR. They must get you an answer."}
            </p>
          )}

          {info?.ready !== false && (
            <form onSubmit={send} className="grid gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="label text-plum">{es ? "Tu pregunta" : "Your question"}</span>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (state !== "sending") setState("idle");
                  }}
                  rows={4}
                  maxLength={2000}
                  required
                  className="field"
                />
              </label>
              {state === "sent" && <p role="status" className="text-sm text-success">{es ? "¡Enviada! Te avisaremos aquí." : "Sent! The answer will show up here."}</p>}
              {state === "error" && <p role="alert" className="text-sm text-error">{es ? "No se pudo enviar. Inténtalo otra vez." : "Couldn't send. Try again."}</p>}
              {state === "too_many" && <p role="alert" className="text-sm text-error">{es ? "Ya enviaste muchas hoy. Pregunta a tu gerente." : "You've sent a lot today. Ask your manager."}</p>}
              <button disabled={state === "sending" || text.trim().length < 3} className="btn btn-primary btn-sm self-start">
                {state === "sending" ? (es ? "Enviando..." : "Sending...") : es ? "Enviar pregunta" : "Send question"}
              </button>
            </form>
          )}

          {!!info?.questions.length && (
            <section className="grid gap-3">
              <h3 className="label text-plum">{es ? "Tus preguntas" : "Your questions"}</h3>
              {info.questions.map((q) => (
                <article key={q.id} className="rounded-[12px] border border-line p-4 text-sm">
                  <p className="whitespace-pre-wrap font-medium text-ink">{q.question}</p>
                  {q.answer ? (
                    <div className="mt-2 border-l-2 border-lilac pl-3">
                      <p className="label text-plum">
                        {q.by}
                        {q.isNew && <span className="chip ml-2">{es ? "Nueva" : "New"}</span>}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{q.answer}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-muted">{es ? "Esperando respuesta" : "Waiting for an answer"}</p>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>
      </dialog>
    </>
  );
}
