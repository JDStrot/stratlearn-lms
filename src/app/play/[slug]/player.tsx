"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CourseArt } from "@/app/learn/course-art";

/**
 * Shows a course inside an iframe and listens for its completion message.
 *
 * A course tells the platform it is finished with:
 *   window.parent.postMessage({ type: "stratlearn:complete", score: 92, lang: "en" }, "*")
 * (score and lang are optional). Lottie courses send it through the script
 * the content route adds to each course (src/lib/course-hook.ts).
 *
 * When the learner taps "Get my pearl and certificate" at the end, the course
 * sends "stratlearn:finished" instead of showing its own pearl page, and the
 * player shows the finish screen: back to My courses, certificate, share.
 */
export function CoursePlayer({ slug, lang, title }: { slug: string; lang: "en" | "es"; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [saved, setSaved] = useState(false);
  // Finish screen: null = hidden, then the certificate code and share token once loaded.
  const [finish, setFinish] = useState<{ certificate: string | null; share: string | null } | "loading" | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const flushTime = useRef<() => Promise<unknown>>(async () => {});
  const onFrameLoad = useRef<() => void>(() => {});

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
    // The course frame is swapped for a fresh one on "Try again", so it
    // reports each load through onFrameLoad.
    onFrameLoad.current = () => {
      touch();
      try {
        watch(frame.current?.contentWindow);
      } catch {}
    };
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
      void send(true);
    };
  }, [slug]);
  // Score under the team's passing bar: a failed try.
  const [failed, setFailed] = useState<{ score?: number; need?: number; triesLeft?: number | null; locked?: boolean } | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frame.current?.contentWindow) return;
      const msg = e.data as { type?: string; score?: number; lang?: string };
      if (msg?.type === "stratlearn:ask") {
        window.dispatchEvent(new Event("stratlearn:ask"));
        return;
      }
      if (msg?.type === "stratlearn:try") {
        void fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, failed: true, score: msg.score, lang: msg.lang ?? lang }),
        });
        return;
      }
      if (msg?.type === "stratlearn:finished") {
        // Wait for the completion to save; a score under the team's bar shows "Try again" instead.
        const ok = saving.current ? await saving.current : true;
        if (!ok) return;
        setFinish("loading");
        const info = await fetch(`/api/completions?slug=${encodeURIComponent(slug)}`)
          .then((r) => r.json())
          .catch(() => ({}));
        setFinish({ certificate: info.certificate ?? null, share: info.share ?? null });
        return;
      }
      if (msg?.type !== "stratlearn:complete") return;
      saving.current = (async () => {
        await flushTime.current();
        const res = await fetch("/api/completions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, score: msg.score, lang: msg.lang ?? lang }),
        });
        if (!res.ok) return false;
        const out = (await res.json().catch(() => ({}))) as { ok?: boolean; score?: number; need?: number; triesLeft?: number | null; locked?: boolean };
        if (out.ok === false) {
          setFailed(out);
          return false;
        }
        setSaved(true);
        return true;
      })();
      await saving.current;
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
        onLoad={() => onFrameLoad.current()}
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
      {finish && <FinishScreen slug={slug} title={title} es={es} info={finish === "loading" ? null : finish} />}
      {saved && !finish && (
        <p role="status" className="chip absolute bottom-4 left-1/2 -translate-x-1/2 shadow-soft">
          {lang === "es" ? "✦ ¡Curso completado y guardado!" : "✦ Course complete and saved!"}
        </p>
      )}
    </div>
  );
}

/** End of a course: one clear way back to My courses, plus certificate and share. */
function FinishScreen({
  slug,
  title,
  es,
  info,
}: {
  slug: string;
  title: string;
  es: boolean;
  info: { certificate: string | null; share: string | null } | null;
}) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (!info?.share) return;
    const url = `${window.location.origin}/share/${info.share}`;
    const text = es ? `¡Terminé ${title}!` : `I finished ${title}!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }
    } catch {
      return; // closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-mist">
      <div className="flex min-h-full items-center justify-center p-4">
        <section
          role="dialog"
          aria-labelledby="finish-title"
          className="card w-full max-w-md overflow-hidden text-center shadow-soft"
        >
          <CourseArt slug={slug} className="aspect-[16/10]" />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <p className="eyebrow">✦ {es ? "Curso completado" : "Course complete"}</p>
            <h1 id="finish-title" className="text-3xl">
              {es ? "Terminaste " : "You finished "}
              <em>{title}</em>
            </h1>
            <p className="text-muted">
              {es
                ? "Tu certificado quedó guardado en Mis cursos, en la sección Ya terminados."
                : "Your certificate is saved in My courses, under Already finished."}
            </p>
            <Link href="/learn" className="btn btn-primary">
              {es ? "Volver a Mis cursos" : "Back to My courses"}
            </Link>
            <div className="grid grid-cols-2 gap-3">
              {info?.certificate ? (
                <Link href={`/verify/${info.certificate}`} className="btn btn-ghost btn-sm">
                  {es ? "Ver certificado" : "View certificate"}
                </Link>
              ) : (
                <span className="btn btn-ghost btn-sm" aria-disabled>
                  {info ? (es ? "Certificado listo pronto" : "Certificate coming") : "…"}
                </span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={share} disabled={!info?.share}>
                {copied ? (es ? "¡Enlace copiado!" : "Link copied!") : es ? "Compartir" : "Share"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
