/**
 * Small, dependency-free charts for the Dashboards pages. Plain HTML + CSS
 * (plus one SVG for lines), so they render on the server, scale to any screen,
 * and print cleanly. Hover or tab onto any bar, dot or cell for its numbers.
 */
import type { Bucket } from "./insights";

export const BUCKET: Record<Bucket, { label: string; color: string; hint: string }> = {
  done: { label: "Done", color: "var(--viz-done)", hint: "Finished and up to date" },
  renew: { label: "Renew soon", color: "var(--viz-renew)", hint: "Finished, retraining date is close" },
  due: { label: "To do", color: "var(--viz-due)", hint: "Not finished, not late yet" },
  overdue: { label: "Overdue", color: "var(--viz-late)", hint: "Past the due date" },
  expired: { label: "Retrain due", color: "var(--viz-expired)", hint: "Retraining date has passed" },
};
export const BUCKET_ORDER: Bucket[] = ["done", "renew", "due", "overdue", "expired"];

const fmt = (n: number) => n.toLocaleString("en-US");

/** Card with a serif title, a one-line "what this shows", and the chart. */
export function Panel({
  title,
  sub,
  children,
  className = "",
  aside,
}: {
  title: React.ReactNode;
  sub?: string;
  children: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
}) {
  return (
    <section className={`card viz-panel flex flex-col gap-4 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl">{title}</h2>
          {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[12px] bg-mist/50 px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

/** Headline number tile, with an optional mini trend line. */
export function Kpi({
  label,
  value,
  note,
  tone,
  spark,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  tone?: "good" | "bad";
  spark?: (number | null)[];
}) {
  return (
    <div className="card viz-panel flex flex-col gap-1 p-5">
      <span className="label text-muted">{label}</span>
      <div className="flex items-end justify-between gap-3">
        <span className={`font-serif text-5xl leading-none ${tone === "bad" ? "text-error" : tone === "good" ? "text-success" : "text-plum"}`}>
          {value}
        </span>
        {spark && spark.filter((v) => v != null).length > 1 && <Spark values={spark} />}
      </div>
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  );
}

function Spark({ values }: { values: (number | null)[] }) {
  const nums = values.map((v) => v ?? 0);
  const max = Math.max(1, ...nums);
  const pts = nums.map((v, i) => `${(i / (nums.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");
  const last = nums[nums.length - 1];
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24 overflow-visible" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--lilac)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="100" cy={28 - (last / max) * 24} r="3.5" fill="var(--violet)" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/** Ring chart for a whole split into parts, with the headline in the middle. */
export function Donut({
  parts,
  center,
  centerNote,
}: {
  parts: { key: string; label: string; value: number; color: string; hint?: string }[];
  center: React.ReactNode;
  centerNote: string;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  const gap = total && parts.filter((p) => p.value).length > 1 ? 1.2 : 0;
  let at = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--mist)" strokeWidth="12" />
          {total > 0 &&
            parts.map((p) => {
              if (!p.value) return null;
              const len = (p.value / total) * C;
              const el = (
                <circle
                  key={p.key}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke={p.color}
                  strokeWidth="12"
                  strokeDasharray={`${Math.max(0.01, len - gap)} ${C}`}
                  strokeDashoffset={-at}
                  className="viz-hit"
                >
                  <title>{`${p.label}: ${fmt(p.value)} (${Math.round((p.value / total) * 100)}%)`}</title>
                </circle>
              );
              at += len;
              return el;
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-serif text-4xl leading-none text-plum">{center}</span>
          <span className="label mt-1 text-[0.65rem] text-muted">{centerNote}</span>
        </div>
      </div>
      <Legend parts={parts} total={total} />
    </div>
  );
}

export function Legend({ parts, total }: { parts: { key: string; label: string; value: number; color: string; hint?: string }[]; total: number }) {
  return (
    <ul className="flex w-full flex-col gap-2">
      {parts.map((p) => (
        <li key={p.key} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="viz-key" style={{ background: p.color }} aria-hidden="true" />
            <span>
              <span className="font-medium text-ink">{p.label}</span>
              {p.hint && <span className="block text-xs text-muted">{p.hint}</span>}
            </span>
          </span>
          <span className="shrink-0 whitespace-nowrap tabular-nums text-muted">
            <span className="font-medium text-ink">{fmt(p.value)}</span>
            {total > 0 && ` · ${Math.round((p.value / total) * 100)}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One thin bar split into parts, with a legend. */
export function SplitBar({ parts }: { parts: { key: string; label: string; value: number; color: string; hint?: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="viz-split" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {total === 0 ? (
          <span style={{ flex: 1, background: "var(--mist)" }} />
        ) : (
          parts.filter((p) => p.value).map((p) => (
            <span key={p.key} style={{ flex: p.value, background: p.color }} title={`${p.label}: ${fmt(p.value)} (${Math.round((p.value / total) * 100)}%)`} />
          ))
        )}
      </div>
      <Legend parts={parts} total={total} />
    </div>
  );
}

/** Columns over time. Hover a column for its number. */
export function Columns({
  data,
  unit,
  tone = "plum",
}: {
  data: { label: string; long: string; value: number }[];
  unit: [string, string];
  tone?: "plum" | "violet";
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = niceTop(max);
  const ticks = [top, top / 2, 0];
  const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
  const every = data.length > 8 ? 2 : 1;
  return (
    <div className="viz-cols" role="img" aria-label={data.map((d) => `${d.long}: ${d.value}`).join(", ")}>
      <div className="viz-cols-axis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t}>{fmt(t)}</span>
        ))}
      </div>
      <div className="viz-cols-plot">
        {ticks.map((t) => (
          <span key={t} className="viz-grid" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />
        ))}
        {data.map((d, i) => {
          const h = top ? (d.value / top) * 100 : 0;
          const showVal = d.value > 0 && (i === peak || i === data.length - 1);
          return (
            <div key={i} className="viz-col" tabIndex={0}>
              <div className="viz-col-bar" style={{ height: `${h}%`, background: tone === "violet" ? "var(--violet)" : "var(--plum)" }}>
                {showVal && <span className="viz-col-val">{fmt(d.value)}</span>}
              </div>
              <span className="viz-tip">
                <strong>{fmt(d.value)}</strong> {d.value === 1 ? unit[0] : unit[1]}
                <br />
                {d.long}
              </span>
              <span className="viz-col-label" aria-hidden="true">{i % every === (data.length - 1) % every ? d.label : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A percent line (0–100%) over time, with a soft fill underneath. */
export function PercentLine({ data }: { data: { label: string; long: string; value: number | null }[] }) {
  const n = data.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - v;
  const pts = data.map((d, i) => (d.value == null ? null : ([x(i), y(d.value)] as const)));
  const segs: (readonly [number, number])[][] = [];
  let cur: (readonly [number, number])[] = [];
  for (const p of pts) {
    if (p) cur.push(p);
    else if (cur.length) {
      segs.push(cur);
      cur = [];
    }
  }
  if (cur.length) segs.push(cur);
  const lastI = data.map((d) => d.value).findLastIndex((v) => v != null);
  const every = n > 8 ? 2 : 1;
  return (
    <div className="viz-cols" role="img" aria-label={data.map((d) => `${d.long}: ${d.value ?? "no training yet"}%`).join(", ")}>
      <div className="viz-cols-axis" aria-hidden="true">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      <div className="viz-cols-plot">
        {[100, 50, 0].map((t) => (
          <span key={t} className="viz-grid" style={{ bottom: `${t}%` }} aria-hidden="true" />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          {segs.map((s, k) => (
            <g key={k}>
              <path d={`M${s[0][0]},100 L${s.map((p) => `${p[0]},${p[1]}`).join(" L")} L${s[s.length - 1][0]},100 Z`} fill="var(--violet)" opacity="0.1" />
              <polyline
                points={s.map((p) => `${p[0]},${p[1]}`).join(" ")}
                fill="none"
                stroke="var(--violet)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>
        {data.map((d, i) =>
          d.value == null ? null : (
            <span key={i} className="viz-dot" tabIndex={0} style={{ left: `${x(i)}%`, bottom: `${d.value}%` }}>
              <span className="viz-tip">
                <strong>{d.value}%</strong> done
                <br />
                end of {d.long.replace("Week of ", "week of ")}
              </span>
              {i === lastI && <span className="viz-dot-val">{d.value}%</span>}
            </span>
          ),
        )}
        <div className="viz-xlabels" aria-hidden="true">
          {data.map((d, i) => (
            <span key={i} style={{ left: `${x(i)}%` }}>{i % every === (n - 1) % every ? d.label : ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Rows of "name — stacked bar — %". Used for roles, locations, clients, courses. */
export function StackRows({
  rows,
}: {
  rows: { key: string; name: React.ReactNode; sub?: string; parts: { key: string; label: string; value: number; color: string }[]; right: React.ReactNode }[];
}) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => {
        const total = r.parts.reduce((a, p) => a + p.value, 0);
        return (
          <li key={r.key}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-ink">{r.name}</span>
                {r.sub && <span className="ml-2 text-muted">{r.sub}</span>}
              </span>
              <span className="tabular-nums text-muted">{r.right}</span>
            </div>
            <div className="viz-split viz-split-sm" role="img" aria-label={r.parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
              {total === 0 ? (
                <span style={{ flex: 1, background: "var(--mist)" }} />
              ) : (
                r.parts.filter((p) => p.value).map((p) => (
                  <span key={p.key} style={{ flex: p.value, background: p.color }} title={`${p.label}: ${fmt(p.value)}`} />
                ))
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Simple single-value bars, e.g. most-finished courses. */
export function BarRows({ rows, max }: { rows: { key: string; name: React.ReactNode; value: number; right: React.ReactNode; title?: string }[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} title={r.title}>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="min-w-0 font-medium text-ink">{r.name}</span>
            <span className="tabular-nums text-muted">{r.right}</span>
          </div>
          <div className="viz-track">
            <span style={{ width: `${Math.max(r.value ? 2 : 0, (r.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Purple shade for a percent: light = few done, deep plum = everyone done. */
export function heat(pct: number) {
  const steps = ["#f6f1ff", "#e9e0ff", "#d6c3fa", "#b48ded", "#7d4cc4", "#400265"];
  const i = pct >= 100 ? 5 : Math.min(4, Math.floor(pct / 20));
  return { bg: steps[i], fg: i >= 4 ? "#fff" : "var(--ink)" };
}

/** Course × location grid of % done. */
export function Heatmap({ cols, rows }: { cols: { id: string; name: string }[]; rows: { course: string; cells: ({ pct: number; ok: number; tot: number } | null)[] }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="viz-heat w-full min-w-[480px] text-sm">
          <thead>
            <tr>
              <th className="label text-left font-semibold text-muted">Course</th>
              {cols.map((c) => (
                <th key={c.id} className="label px-1 text-center font-semibold text-muted">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.course}>
                <th scope="row" className="max-w-[240px] truncate pr-3 text-left font-medium text-ink">{r.course}</th>
                {r.cells.map((c, i) => {
                  if (!c) return <td key={i}><span className="viz-cell viz-cell-none" title="Not assigned here">–</span></td>;
                  const h = heat(c.pct);
                  return (
                    <td key={i}>
                      <span className="viz-cell" style={{ background: h.bg, color: h.fg }} title={`${r.course} · ${cols[i].name}: ${c.ok} of ${c.tot} done`}>
                        {c.pct}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted" aria-hidden="true">
        <span>0%</span>
        {[0, 20, 40, 60, 80, 100].map((p) => (
          <span key={p} className="viz-key !h-3 !w-6" style={{ background: heat(p).bg }} />
        ))}
        <span>100% done</span>
        <span className="ml-3">– = not assigned there</span>
      </div>
    </div>
  );
}

/** Round a max value up to a clean axis top (1, 2, 5, 10, 20, 50 …). */
function niceTop(max: number) {
  if (max <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 4, 6, 8, 10]) if (m * p >= max) return m * p;
  return 10 * p;
}
