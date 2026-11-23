"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows a course inside an iframe and listens for its completion message.
 *
 * A course tells the platform it is finished with:
 *   window.parent.postMessage({ type: "stratlearn:complete", score: 92, lang: "en" }, "*")
 * (score and lang are optional). The Lottie course player still needs this
 * one-line hook added; see README "Course completion hook".
 */
export function CoursePlayer({ slug, lang }: { slug: string; lang: "en" | "es" }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [saved, setSaved] = useState(false);

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
      if (res.ok) setSaved(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug, lang]);

  return (
    <div className="relative flex-1">
      <iframe
        ref={frame}
        src={`/play/${slug}/content#lang=${lang}`}
        title="Course"
        className="absolute inset-0 size-full border-0"
        allow="fullscreen; autoplay"
      />
      {saved && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-white shadow">
          {lang === "es" ? "¡Curso completado y guardado!" : "Course complete and saved!"}
        </p>
      )}
    </div>
  );
}
