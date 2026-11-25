import { Columns, Empty, Panel } from "./charts";
import type { TeamInsights } from "./insights";

type Learning = TeamInsights["learning"];

const mins = (m: number | null) => (m == null ? "–" : m < 1 ? "<1 min" : `${m} min`);

/** Time spent and final-check results: three headline numbers and two charts. */
export function LearningPanels({ l, unitNote }: { l: Learning; unitNote: string }) {
  const triedAny = l.triedCount > 0 || l.scoreBands.some((b) => b.value);
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Panel title={<>Time & <em>tries</em></>} sub={`Courses finished ${unitNote}: how long they took and how many final-check tries.`}>
        {!l.tracking ? (
          <Empty>Time and tries start recording once the time-and-tries update is switched on.</Empty>
        ) : l.timedCount === 0 && l.triedCount === 0 ? (
          <Empty>Nothing recorded in this time yet. Numbers appear as people finish courses.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Mini label="Avg time to finish" value={mins(l.avgMinutes)} note={l.timedCount ? `${l.totalHours} hrs in total` : "not recorded yet"} />
              <Mini label="Passed first try" value={l.firstTryPct == null ? "–" : `${l.firstTryPct}%`} note={`of ${l.triedCount} finished`} />
              <Mini label="Avg tries" value={l.avgTries == null ? "–" : String(l.avgTries)} note={`${l.failedTries} not-passed ${l.failedTries === 1 ? "try" : "tries"}`} />
            </div>
            {l.triedCount > 0 && <Columns data={l.triesDist} unit={["course", "courses"]} tone="violet" />}
            {l.triedCount > 0 && <p className="-mt-2 text-center text-xs text-muted">Number of final-check tries it took to pass</p>}
          </>
        )}
      </Panel>
      <Panel title={<>Quiz <em>scores</em></>} sub={`Every final-check try ${unitNote}, passed or not, by score.`}>
        {!l.tracking ? (
          <Empty>Every try&apos;s score starts recording once the time-and-tries update is switched on.</Empty>
        ) : triedAny ? (
          <>
            <Columns data={l.scoreBands} unit={["try", "tries"]} />
            <p className="-mt-2 text-center text-xs text-muted">Score on the final check</p>
          </>
        ) : (
          <Empty>No final-check tries in this time yet.</Empty>
        )}
      </Panel>
    </div>
  );
}

function Mini({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[12px] bg-mist/50 p-3">
      <p className="label text-[0.65rem] text-muted">{label}</p>
      <p className="font-serif text-3xl leading-tight text-plum">{value}</p>
      <p className="text-xs text-muted">{note}</p>
    </div>
  );
}

export { mins };
