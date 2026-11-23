/**
 * STRATLEARN wordmark. Placeholder text version until the logo files from
 * stratlearn.co (logo.png, logo-tagline-rev.png) are added to public/brand/.
 */
export function Logo({ tone = "dark", tagline = false }: { tone?: "dark" | "light"; tagline?: boolean }) {
  const color = tone === "light" ? "text-white" : "text-plum";
  return (
    <span className={`inline-flex flex-col leading-none ${color}`}>
      <span className="font-label text-[1.35rem] font-semibold tracking-[0.2em]">
        STRATLEARN<span aria-hidden className={tone === "light" ? "text-lilac" : "text-violet"}> ✦</span>
      </span>
      {tagline && (
        <span className={`mt-1.5 font-serif text-base italic ${tone === "light" ? "text-lilac" : "text-violet"}`}>
          The Strategic Learning Co.
        </span>
      )}
    </span>
  );
}
