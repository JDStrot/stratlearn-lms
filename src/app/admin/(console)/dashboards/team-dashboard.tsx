import Link from "next/link";
import { fmtDate, type Named } from "../../data";
import { PageHead } from "../../ui";
import { RANGES, type Filter, type Range, type TeamInsights } from "../../insights";
import { BUCKET, BUCKET_ORDER, BarRows, Columns, Donut, Empty, Heatmap, Kpi, Panel, PercentLine, SplitBar, StackRows } from "../../charts";
import { PrintSnapshot } from "../../print-button";

/** The manager Dashboards page body (data in, charts out). */
export function TeamDashboard({ orgName, roles, locations, d, f }: { orgName: string; roles: Named[]; locations: Named[]; d: TeamInsights; f: Filter }) {
  const team = { roles, locations };
  const s = { org: { name: orgName } };
  const roleName = f.role ? team.roles.find((r) => r.id === f.role)?.name : null;
  const locName = f.location ? team.locations.find((r) => r.id === f.location)?.name : null;
  const scope = [roleName, locName].filter(Boolean).join(" · ") || "Everyone";
  const parts = BUCKET_ORDER.filter((b) => b !== "renew" || d.mix.renew).map((b) => ({ key: b, label: BUCKET[b].label, hint: BUCKET[b].hint, value: d.mix[b], color: BUCKET[b].color }));
  const groupRows = (gs: typeof d.byRole) =>
    gs.map((g) => ({
      key: g.id || "none",
      name: g.name,
      sub: `${g.people} ${g.people === 1 ? "person" : "people"}`,
      parts: BUCKET_ORDER.map((b) => ({ key: b, label: BUCKET[b].label, value: g.counts[b], color: BUCKET[b].color })),
      right: (
        <>
          <span className="font-medium text-ink">{g.assigned ? Math.round((g.current / g.assigned) * 100) : 0}%</span> done
          {g.late > 0 && <span className="text-error"> · {g.late} late</span>}
        </>
      ),
    }));
  const finishedTotal = d.finished.reduce((a, p) => a + p.value, 0);
  const unit = d.range === "3m" ? "week" : "month";
  const langTotal = d.langCount.en + d.langCount.es;

  return (
    <>
      <div className="print-only mb-6 border-b border-line pb-4">
        <p className="eyebrow">STRATLEARN training snapshot</p>
        <p className="mt-1 font-serif text-3xl text-plum">{s.org.name}</p>
        <p className="text-sm text-muted">
          {scope} · {RANGES[d.range as Range]} · printed {fmtDate(new Date().toISOString())}
        </p>
      </div>

      <div className="no-print">
        <PageHead eyebrow={`✦ ${s.org.name}`} title={<>Training <em>dashboards</em></>}>
          <PrintSnapshot />
          <Link href="/admin/reports" className="btn btn-ghost btn-sm">Tables & CSV</Link>
        </PageHead>

        <form className="mb-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Time</span>
            <select name="range" defaultValue={d.range} className="field">
              {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Role</span>
            <select name="role" defaultValue={f.role ?? ""} className="field">
              <option value="">All roles</option>
              {team.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Location</span>
            <select name="location" defaultValue={f.location ?? ""} className="field">
              <option value="">All locations</option>
              {team.locations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <button className="btn btn-primary btn-sm">Show</button>
          {(f.role || f.location || f.range) && <Link href="/admin/dashboards" className="btn btn-ghost btn-sm">Reset</Link>}
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Training done" value={`${d.pct}%`} note={`${d.current} of ${d.assigned} assigned courses`} tone={d.assigned && d.pct >= 90 ? "good" : undefined} spark={d.trend.map((t) => t.value)} />
        <Kpi label="Late right now" value={d.late} note={d.late ? "overdue or past their retrain date" : "nobody is behind"} tone={d.late ? "bad" : "good"} />
        <Kpi label={`Finished, ${RANGES[d.range as Range].toLowerCase()}`} value={finishedTotal} note={`${d.finishedMonth} in the last 30 days`} spark={d.finished.map((p) => p.value)} />
        <Kpi label="Average quiz score" value={d.avgScore == null ? "–" : `${d.avgScore}%`} note={d.avgScore == null ? "no scored courses yet" : "on courses finished in this time"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Panel title={<>Where training <em>stands</em></>} sub="Every assigned course, right now.">
          {d.assigned ? <Donut parts={parts} center={`${d.pct}%`} centerNote="done" /> : <Empty>Assign training to see this chart.</Empty>}
        </Panel>
        <Panel title={<>Done over <em>time</em></>} sub={`Share of assigned training that was done at the end of each ${unit}.`}>
          {d.trend.some((t) => t.value != null) ? <PercentLine data={d.trend} /> : <Empty>Nothing assigned in this time yet.</Empty>}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={<>Courses <em>finished</em></>} sub={`How many courses people finished each ${unit}.`}>
          {finishedTotal ? <Columns data={d.finished} unit={["course finished", "courses finished"]} /> : <Empty>No courses finished in this time yet.</Empty>}
        </Panel>
        <Panel
          title={<>Retraining <em>coming up</em></>}
          sub="Finished courses whose retrain date lands in each of the next 6 months."
        >
          {d.repeating === 0 ? (
            <Empty>None of your assigned courses repeat yet. Yearly or every-2-year courses will show here.</Empty>
          ) : (
            <>
              <Columns data={d.months} unit={["person to retrain", "people to retrain"]} tone="violet" />
              {d.upcoming.length > 0 && (
                <ul className="divide-y divide-line text-sm">
                  {d.upcoming.slice(0, 5).map((u, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2">
                      <span><Link href={`/admin/people/${u.personId}`} className="font-medium text-ink">{u.name}</Link> <span className="text-muted">· {u.course}</span></span>
                      <span className="shrink-0 text-muted">{fmtDate(u.dueAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={<>By <em>role</em></>} sub="Who is ahead and who is behind. Most late first.">
          {d.byRole.length ? <StackRows rows={groupRows(d.byRole)} /> : <Empty>Add people to see this.</Empty>}
          <MiniLegend />
        </Panel>
        <Panel title={<>By <em>location</em></>} sub="The same view, split by location.">
          {d.byLocation.length ? <StackRows rows={groupRows(d.byLocation)} /> : <Empty>Add people to see this.</Empty>}
          <MiniLegend />
        </Panel>
      </div>

      <Panel className="mt-6" title={<>Compliance <em>map</em></>} sub="Percent of people done with each course, at each location. Deeper purple means more people are done.">
        {d.grid.rows.length ? <Heatmap cols={d.grid.cols} rows={d.grid.rows} /> : <Empty>Assign training to see this map.</Empty>}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel title={<>Courses at a <em>glance</em></>} sub="Most finished in this time, with average quiz score.">
          {d.courses.length ? (
            <BarRows
              rows={d.courses.slice(0, 8).map((c) => ({
                key: c.id,
                name: c.title,
                value: c.finishes,
                title: `${c.current} of ${c.assigned} assigned are done${c.late ? `, ${c.late} late` : ""}`,
                right: (
                  <>
                    <span className="font-medium text-ink">{c.finishes}</span> finished
                    {c.avgScore != null && <> · avg {c.avgScore}%</>}
                    {c.assigned > 0 && <> · {Math.round((c.current / c.assigned) * 100)}% done</>}
                  </>
                ),
              }))}
            />
          ) : (
            <Empty>No courses yet.</Empty>
          )}
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title={<>People <em>signing in</em></>} sub="Have your people opened the app?">
            <SplitBar
              parts={[
                { key: "recent", label: "Signed in, last 30 days", value: d.people.recentIn, color: "var(--plum)" },
                { key: "older", label: "Signed in before that", value: d.people.everIn - d.people.recentIn, color: "var(--lilac)" },
                { key: "never", label: "Never signed in", value: d.people.total - d.people.everIn, color: "var(--mist)" },
              ]}
            />
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{d.people.allClear}</span> of {d.people.total} people have every assigned course done.
              {d.inProgress > 0 && <> {d.inProgress} {d.inProgress === 1 ? "course is" : "courses are"} started but not finished.</>}
            </p>
          </Panel>
          <Panel title={<>English & <em>Spanish</em></>} sub="Language people chose when they finished a course.">
            {langTotal ? (
              <SplitBar
                parts={[
                  { key: "en", label: "English", value: d.langCount.en, color: "var(--violet)" },
                  { key: "es", label: "Español", value: d.langCount.es, color: "var(--viz-es)" },
                ]}
              />
            ) : (
              <Empty>No courses finished in this time yet.</Empty>
            )}
          </Panel>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted no-print">
        Tip: hover or tap any bar, dot or square to see its numbers. Use <strong>Print or save PDF</strong> for an audit snapshot.
      </p>
    </>
  );
}

function MiniLegend() {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {BUCKET_ORDER.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <span className="viz-key !h-2.5 !w-2.5" style={{ background: BUCKET[b].color }} aria-hidden="true" />
          {BUCKET[b].label}
        </li>
      ))}
    </ul>
  );
}
