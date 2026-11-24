"use client";

import { useEffect, useRef } from "react";

/** Shared tablet: signs out after a few quiet minutes so the next person starts fresh. */
export function IdleSignOut({ minutes = 5 }: { minutes?: number }) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => form.current?.requestSubmit(), minutes * 60_000);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes]);
  return <form ref={form} action="/tablet/done" method="post" hidden />;
}
