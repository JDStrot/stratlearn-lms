"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows a course inside an iframe and listens for its completion message.
 *
 * A course tells the platform it is finished with:
 *   window.parent.postMessage({ type: "stratlearn:complete", score: 92, lang: "en" }, "*")
 * (score and lang are optional). Lottie courses send it through the script
 * the content route adds to each course (src/lib/course-hook.ts).
 */
export function CoursePlayer({ slug, lang }: { slug: string; lang: "en" | "es" }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [saved, setSaved] = useState(false);
  // Score under the team's passing bar: a failed try.
  const [failed, setFailed] = useState<{ score?: number; need?: number; triesLeft?: number | null; locked?: boolean } | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frame.current?.contentWindow) return;
      const msg = e.data as { type?: string; score?: number; lang?: string };
      if (msg?.type !== "stratlearn:complete") return;
      const res = await fetch("/api/completions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, score: msg.score, lang: msg.lang ?? lang }),
      });
      if (!res.ok) return;
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; score?: number; need?: number; triesLeft?: number | null; locked?: boolean };
      if (out.ok === false) setFailed(out);
      else setSaved(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug, lang]);

  const es = lang === "es";
  return (
    <div className="relative flex-1">
      <iframe
        ref={frame}
        key={round}
        src={`/play/${slug}/content?try=${round}#lang=${lang}`}
        title="Course"
        className="absolute inset-0 size-full border-0"
        allow="fullscreen; autoplay"
      />
      {failed && (
        <div role="alert" className="card absolute bottom-4 left-1/2 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 flex-col gap-3 p-5 shadow-soft">
          <p>
            {es
              ? `Obtuviste ${failed.score ?? "?"}%. Necesitas ${failed.need ?? "?"}% para aprobar.`
              : `You scored ${failed.score ?? "?"}%. You need ${failed.need ?? "?"}% to pass.`}{" "}
            {failed.locked
              ? es
                ? "Pide a tu gerente más intentos."
                : "Ask your manager for more tries."
              : failed.triesLeft != null
                ? es
                  ? `Te quedan ${failed.triesLeft} intentos.`
                  : `${failed.triesLeft} ${failed.triesLeft === 1 ? "try" : "tries"} left.`
                : ""}
          </p>
          {!failed.locked && (
            <button
              className="btn btn-primary btn-sm self-start"
              onClick={() => {
                setFailed(null);
                setRound((n) => n + 1);
              }}
            >
              {es ? "Intentar de nuevo" : "Try again"}
            </button>
          )}
        </div>
      )}
      {saved && (
        <p role="status" className="chip absolute bottom-4 left-1/2 -translate-x-1/2 shadow-soft">
          {lang === "es" ? "✦ ¡Curso completado y guardado!" : "✦ Course complete and saved!"}
        </p>
      )}
    </div>
  );
}
