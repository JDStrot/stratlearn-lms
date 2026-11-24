/* eslint-disable @next/next/no-img-element */

/**
 * STRATLEARN logo from Jesse's Logo Kit 3 (public/brand/).
 * dark  = plum + violet wordmark for light backgrounds
 * light = white + lilac wordmark for dark backgrounds (tagline version in the footer)
 */
export function Logo({ tone = "dark", tagline = false }: { tone?: "dark" | "light"; tagline?: boolean }) {
  if (tagline) {
    return (
      <img
        src="/brand/logo-tagline-rev.png"
        alt="STRATLEARN, The Strategic Learning Co."
        width={800}
        height={199}
        className="h-auto w-[220px] sm:w-[260px]"
      />
    );
  }
  return (
    <img
      src={tone === "light" ? "/brand/logo-rev.png" : "/brand/logo.png"}
      alt="STRATLEARN"
      width={720}
      height={119}
      className="h-auto w-[150px] sm:w-[180px]"
    />
  );
}
