import Link from "next/link";
import { PageHead } from "../../ui";
import { PrintSnapshot } from "../../print-button";

export const metadata = { title: "STRATLEARN · Manager quick-start" };

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Set up your team (10 minutes, once)",
    body: (
      <ul>
        <li>
          In <Link href="/admin/settings">Team settings</Link>, check your team name and <strong>team code</strong>. Workers
          type the code to sign in.
        </li>
        <li>Add your <strong>job roles</strong> and <strong>locations</strong>. Training can be assigned by either.</li>
        <li>
          Under <Link href="/admin/settings/states">State rules</Link>, set the state for each location so the right state
          courses are suggested.
        </li>
        <li>
          Under <Link href="/admin/settings/trainers">Ask a trainer</Link>, name your safety trainer and HR trainer. Some
          state laws require workers to be able to ask a trainer questions.
        </li>
        <li>Pick which sign-in options your workers can use (PIN, QR badge, email, shared tablet). To set up a shared tablet, open Team settings on that tablet.</li>
      </ul>
    ),
  },
  {
    title: "Add your people",
    body: (
      <ul>
        <li>
          Go to <Link href="/admin/people">People</Link> and choose <strong>Paste a list</strong>. One person per line:
          Name, Role, Location. You can paste straight from a spreadsheet.
        </li>
        <li>
          New PINs show <strong>once</strong>. Click <strong>Print welcome slips</strong> right away and hand one to each
          person. If you miss it, use <strong>Reset PIN</strong> on that person.
        </li>
        <li>
          Prefer badges? <Link href="/admin/badges">Print badges</Link> makes QR sign-in cards, 8 per page.
        </li>
      </ul>
    ),
  },
  {
    title: "Assign training",
    body: (
      <ul>
        <li>
          In <Link href="/admin/assign">Assign training</Link>, choose a whole pack, one role path, or one course.
        </li>
        <li>Choose who: everyone, a role, a location, or one person. New hires who match are added automatically.</li>
        <li>Set a due date. For courses the law repeats (like harassment prevention), set the retraining clock.</li>
      </ul>
    ),
  },
  {
    title: "Keep an eye on it (5 minutes a week)",
    body: (
      <ul>
        <li>
          <Link href="/admin">Overview</Link> shows done %, who&apos;s overdue, and progress by role.
          <Link href="/admin/dashboards"> Dashboards</Link> show trends.
        </li>
        <li>
          Turn on <Link href="/admin/settings/reminders">Reminders</Link> so workers and managers get nudged before and
          after due dates.
        </li>
        <li>
          Answer workers in <Link href="/admin/questions">Questions</Link> if your trainer doesn&apos;t answer by email.
        </li>
      </ul>
    ),
  },
  {
    title: "When an inspector or lawyer asks for proof",
    body: (
      <ul>
        <li>
          <Link href="/admin/reports">Reports</Link> has CSV downloads of status, full training records with certificate
          codes, and your activity log.
        </li>
        <li>Every certificate has a code anyone can check on our verify page.</li>
        <li>Records stay even after you turn someone off or a course gets a new version.</li>
      </ul>
    ),
  },
];

const FIXES: [string, string][] = [
  ["Someone forgot their PIN", "People > their name > Reset PIN. This also unlocks them."],
  ["Someone is locked out", "People > their name > Unlock. (It also clears by itself after 15 minutes.)"],
  ["A QR badge was lost", "People > their name > New QR badge, then print it. The old badge stops working."],
  ["Someone ran out of tries", "People > their name > Give more tries."],
  ["Someone left the company", "People > their name > turn them off. Their records stay, and their seat frees up."],
  ["You want to see what they see", "People > their name > View as."],
];

export default function ManagerHelp() {
  return (
    <div>
      <PageHead eyebrow="✦ Help" title={<>Manager <em>quick-start</em></>}>
        <PrintSnapshot label="Print this guide" />
      </PageHead>

      <div className="doc !max-w-none">
        <ol className="!list-none !pl-0 grid gap-4 lg:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card !mb-0 p-6">
              <h2 className="!mt-0">
                <span className="text-violet">{i + 1}.</span> {s.title}
              </h2>
              {s.body}
            </li>
          ))}
        </ol>

        <h2>Quick fixes</h2>
        <table>
          <thead>
            <tr><th>If…</th><th>Do this</th></tr>
          </thead>
          <tbody>
            {FIXES.map(([a, b]) => (
              <tr key={a}><td>{a}</td><td>{b}</td></tr>
            ))}
          </tbody>
        </table>

        <h2>Getting help from us</h2>
        <ul>
          <li>
            Send a message from <Link href="/contact">Contact us</Link>. We answer within one business day, and the same
            day for sign-in problems that stop your team from training.
          </li>
          <li>
            Share the <Link href="/help">worker help page</Link> with your team. It answers the common sign-in questions in
            English and Spanish.
          </li>
          <li>
            How we handle your team&apos;s data: <Link href="/client-agreement">client data agreement</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </li>
        </ul>
      </div>
    </div>
  );
}
