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
  const flushTime = useRef<() => Promise<unknown>>(async () => {});

  // Active time in the course: counts while the tab is visible and the learner
  // has tapped, typed or scrolled in the last 2 minutes. Sent every 30 seconds,
  // and when the page is hidden or closed.
  useEffect(() => {
    let last = Date.now();
    let pending = 0;
    const touch = () => (last = Date.now());
    const evs = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    const watch = (w: Window | null | undefined) => {
      if (!w) return;
      for (const ev of evs) w.addEventListener(ev, touch, { passive: true, capture: true });
    };
    watch(window);
    const f = frame.current;
    const onLoad = () => {
      touch();
      try {
        watch(f?.contentWindow);
      } catch {}
    };
    f?.addEventListener("load", onLoad);
    const send = async (beacon = false) => {
      const seconds = Math.round(pending);
      if (seconds < 1) return;
      pending = 0;
      const body = JSON.stringify({ slug, seconds });
      if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
      else await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    };
    flushTime.current = () => send();
    const tick = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - last < 120_000) pending += 5;
    }, 5000);
    const flush = setInterval(() => void send(), 30_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void send(true);
    };
    const onLeave = () => void send(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);
    return () => {
      clearInterval(tick);
      clearInterval(flush);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
      f?.removeEventListener("load", onLoad);
      void send(true);
    };
  }, [slug]);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frame.current?.contentWindow) return;
      const msg = e.data as { type?: string; score?: number; lang?: string };
      if (msg?.type === "stratlearn:try") {
        void fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, failed: true, score: msg.score, lang: msg.lang ?? lang }),
        });
        return;
      }
      if (msg?.type !== "stratlearn:complete") return;
      await flushTime.current();
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
        <p role="status" className="chip absolute bottom-4 left-1/2 -translate-x-1/2 shadow-soft">
          {lang === "es" ? "✦ ¡Curso completado y guardado!" : "✦ Course complete and saved!"}
        </p>
      )}
    </div>
  );
}
