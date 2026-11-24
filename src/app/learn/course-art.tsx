"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

/**
 * A course's Lottie title art (public/course-art/<slug>.jpg, made by
 * scripts/make-course-art.mjs). Falls back to a soft mist panel with a sparkle
 * if a course has no picture yet.
 */
export function CourseArt({ slug, className = "" }: { slug: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-mist ${className}`}>
      {failed ? (
        <span aria-hidden className="absolute inset-0 grid place-items-center text-3xl text-lilac">
          ✦
        </span>
      ) : (
        <img
          src={`/course-art/${slug}.jpg`}
          alt=""
          width={944}
          height={590}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}
