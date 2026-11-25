import Link from "next/link";
import { fmtDate } from "../../../data";
import { PageHead } from "../../../ui";
import { RANGES, type Bucket, type Range, type TeamInsights } from "../../../insights";
import { BUCKET, BUCKET_ORDER, BarRows, Columns, Donut, Empty, Kpi, Panel, PercentLine, SplitBar, StackRows } from "../../../charts";
import { PrintSnapshot } from "../../../print-button";
import { LearningPanels } from "../../../learning-panels";

export type ClientInsights = { org: { id: string; name: string; plan: string; status: string; seat_limit: number | null }; d: TeamInsights };

/** The owner portal's Platform dashboards body (data in, charts out). */
export function PlatformDashboard({ per, orgs, plans, range, f }: { per: ClientInsights[]; orgs: ClientInsights["org"][]; plans: string[]; range: Range; f: { plan?: string } }) {
  const mix = Object.fromEntries(BUCKET_ORDER.map((b) => [b, per.reduce((a, p) => a + p.d.mix[b], 0)])) as Record<Bucket, number>;
  const assigned = per.reduce((a, p) => a + p.d.assigned, 0);
  const current = per.reduce((a, p) => a + p.d.current, 0);
  const late = per.reduce((a, p) => a + p.d.late, 0);
  const pct = assigned ? Math.round((current / assigned) * 100) : 0;
  const people = per.reduce((a, p) => a + p.d.people.total, 0);
  const recentIn = per.reduce((a, p) => a + p.d.people.recentIn, 0);
  const everIn = per.reduce((a, p) => a + p.d.people.everIn, 0);

  const base = per[0]?.d;
  const finished = (base?.finished ?? []).map((pt, i) => ({ ...pt, value: per.reduce((a, p) => a + p.d.finished[i].value, 0) }));
  const trend = (base?.trend ?? []).map((pt, i) => {
    const tot = per.reduce((a, p) => a + p.d.trend[i].total, 0);
    const ok = per.reduce((a, p) => a + p.d.trend[i].ok, 0);
    return { ...pt, value: tot ? Math.round((ok / tot) * 100) : null };
  });
  const months = (base?.months ?? []).map((pt, i) => ({ ...pt, value: per.reduce((a, p) => a + p.d.months[i].value, 0) }));
  const finishedTotal = finished.reduce((a, p) => a + p.value, 0);

  const courseMap = new Map<string, { title: string; finishes: number; scores: number[]; clients: number }>();
  for (const p of per)
    for (const c of p.d.courses) {
      const v = courseMap.get(c.id) ?? { title: c.title, finishes: 0, scores: [], clients: 0 };
      v.finishes += c.finishes;
      v.scores.push(...c.scores);
      if (c.assigned) v.clients++;
      courseMap.set(c.id, v);
    }
  const courses = [...courseMap.entries()]
    .map(([id, c]) => ({ id, ...c, avg: c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) : null }))
    .sort((a, b) => b.finishes - a.finishes || b.clients - a.clients)
    .slice(0, 10);
  const lang = { en: per.reduce((a, p) => a + p.d.langCount.en, 0), es: per.reduce((a, p) => a + p.d.langCount.es, 0) };
  const unit = range === "3m" ? "week" : "month";
  const L = per.map((p) => p.d.learning);
  const wavg = (pick: (l: (typeof L)[number]) => number | null, w: (l: (typeof L)[number]) => number) => {
    const tot = L.reduce((a, l) => a + (pick(l) != null ? w(l) : 0), 0);
    return tot ? L.reduce((a, l) => a + (pick(l) ?? 0) * (pick(l) != null ? w(l) : 0), 0) / tot : null;
  };
  const avgTries = wavg((l) => l.avgTries, (l) => l.triedCount);
  const avgMinutes = wavg((l) => l.avgMinutes, (l) => l.timedCount);
  const firstTryPct = wavg((l) => l.firstTryPct, (l) => l.triedCount);
  const learning = {
    tracking: L.some((l) => l.tracking),
    avgMinutes: avgMinutes == null ? null : Math.round(avgMinutes),
    totalHours: Math.round(L.reduce((a, l) => a + l.totalHours, 0) * 10) / 10,
    timedCount: L.reduce((a, l) => a + l.timedCount, 0),
    avgTries: avgTries == null ? null : Math.round(avgTries * 10) / 10,
    firstTryPct: firstTryPct == null ? null : Math.round(firstTryPct),
    triedCount: L.reduce((a, l) => a + l.triedCount, 0),
    failedTries: L.reduce((a, l) => a + l.failedTries, 0),
    scoreBands: (L[0]?.scoreBands ?? []).map((b, i) => ({ ...b, value: L.reduce((a, l) => a + l.scoreBands[i].value, 0) })),
    triesDist: (L[0]?.triesDist ?? []).map((b, i) => ({ ...b, value: L.reduce((a, l) => a + l.triesDist[i].value, 0) })),
    byCourse: {},
  };

  const clientsByLate = [...per].sort((a, b) => b.d.late - a.d.late || a.d.pct - b.d.pct);

  return (
    <div className="viz-root">
      <div className="print-only mb-6 border-b border-line pb-4">
        <p className="eyebrow">STRATLEARN platform snapshot</p>
        <p className="mt-1 font-serif text-3xl text-plum">All clients{f.plan ? ` · ${f.plan}` : ""}</p>
        <p className="text-sm text-muted">{RANGES[range]} · printed {fmtDate(new Date().toISOString())}</p>
      </div>

      <div className="no-print">
        <PageHead eyebrow="★ STRATLEARN owner portal" title={<>Platform <em>dashboards</em></>}>
          <PrintSnapshot />
          <Link href="/admin/owner" className="btn btn-ghost btn-sm">All clients</Link>
        </PageHead>
        <form className="mb-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Time</span>
            <select name="range" defaultValue={range} className="field">
              {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label text-plum">Plan</span>
            <select name="plan" defaultValue={f.plan ?? ""} className="field">
              <option value="">All plans</option>
              {plans.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <button className="btn btn-primary btn-sm">Show</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Clients" value={orgs.length} note={`${orgs.filter((o) => o.status === "active").length} active · ${people} learners`} />
        <Kpi label="Training done" value={`${pct}%`} note={`${current} of ${assigned} assigned courses`} spark={trend.map((t) => t.value)} tone={assigned && pct >= 90 ? "good" : undefined} />
        <Kpi label="Late right now" value={late} note="across all clients" tone={late ? "bad" : "good"} />
        <Kpi label={`Finished, ${RANGES[range as Range].toLowerCase()}`} value={finishedTotal} note={`${recentIn} learners active in the last 30 days`} spark={finished.map((p) => p.value)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <Panel title={<>Where training <em>stands</em></>} sub="Every assigned course, every client.">
          {assigned ? (
            <Donut
              parts={BUCKET_ORDER.filter((b) => b !== "renew" || mix.renew).map((b) => ({ key: b, label: BUCKET[b].label, hint: BUCKET[b].hint, value: mix[b], color: BUCKET[b].color }))}
              center={`${pct}%`}
              centerNote="done"
            />
          ) : (
            <Empty>No training assigned yet.</Empty>
          )}
        </Panel>
        <Panel title={<>Done over <em>time</em></>} sub={`Share of all assigned training done at the end of each ${unit}.`}>
          {trend.some((t) => t.value != null) ? <PercentLine data={trend} /> : <Empty>Nothing assigned in this time yet.</Empty>}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={<>Courses <em>finished</em></>} sub={`All clients, each ${unit}.`}>
          {finishedTotal ? <Columns data={finished} unit={["course finished", "courses finished"]} /> : <Empty>No courses finished in this time yet.</Empty>}
        </Panel>
        <Panel title={<>Retraining <em>coming up</em></>} sub="People across all clients due to retrain in each of the next 6 months.">
          {months.some((m) => m.value) ? <Columns data={months} unit={["person to retrain", "people to retrain"]} tone="violet" /> : <Empty>No retraining dates in the next 6 months.</Empty>}
        </Panel>
      </div>

      <LearningPanels l={learning} unitNote={`across all clients in the ${RANGES[range].toLowerCase()}`} />

      <Panel className="mt-6" title={<>Clients, <em>side by side</em></>} sub="Most late first. Click a client to open it.">
        {per.length ? (
          <StackRows
            rows={clientsByLate.map(({ org, d }) => ({
              key: org.id,
              name: <Link href={`/admin/owner/clients/${org.id}`} className="text-ink">{org.name}</Link>,
              sub: `${org.plan} · ${d.people.total}${org.seat_limit ? ` / ${org.seat_limit}` : ""} seats`,
              parts: BUCKET_ORDER.map((b) => ({ key: b, label: BUCKET[b].label, value: d.mix[b], color: BUCKET[b].color })),
              right: (
                <>
                  <span className="font-medium text-ink">{d.pct}%</span> done
                  {d.late > 0 && <span className="text-error"> · {d.late} late</span>}
                </>
              ),
            }))}
          />
        ) : (
          <Empty>No clients yet.</Empty>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel title={<>Most popular <em>courses</em></>} sub="Finished most often across all clients in this time.">
          {courses.some((c) => c.finishes) ? (
            <BarRows
              rows={courses.map((c) => ({
                key: c.id,
                name: c.title,
                value: c.finishes,
                right: (
                  <>
                    <span className="font-medium text-ink">{c.finishes}</span> finished · {c.clients} {c.clients === 1 ? "client" : "clients"}
                    {c.avg != null && <> · avg {c.avg}%</>}
                  </>
                ),
              }))}
            />
          ) : (
            <Empty>No courses finished in this time yet.</Empty>
          )}
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title={<>Seats in <em>use</em></>} sub="Learners per client against their seat limit.">
            {per.some((p) => p.org.seat_limit) ? (
              <BarRows
                max={100}
                rows={per
                  .filter((p) => p.org.seat_limit)
                  .map(({ org, d }) => ({
                    key: org.id,
                    name: org.name,
                    value: Math.min(100, Math.round((d.people.total / (org.seat_limit as number)) * 100)),
                    right: `${d.people.total} / ${org.seat_limit}`,
                  }))}
              />
            ) : (
              <Empty>No clients have a seat limit set.</Empty>
            )}
          </Panel>
          <Panel title={<>Learners <em>signing in</em></>}>
            <SplitBar
              parts={[
                { key: "recent", label: "Last 30 days", value: recentIn, color: "var(--plum)" },
                { key: "older", label: "Before that", value: everIn - recentIn, color: "var(--lilac)" },
                { key: "never", label: "Never", value: people - everIn, color: "var(--mist)" },
              ]}
            />
          </Panel>
          <Panel title={<>English & <em>Spanish</em></>}>
            {lang.en + lang.es ? (
              <SplitBar
                parts={[
                  { key: "en", label: "English", value: lang.en, color: "var(--violet)" },
                  { key: "es", label: "Español", value: lang.es, color: "var(--viz-es)" },
                ]}
              />
            ) : (
              <Empty>No courses finished in this time yet.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
