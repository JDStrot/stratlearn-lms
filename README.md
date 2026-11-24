# StratLearn LMS

Gamified, bilingual training platform for frontline teams.

## Courses

- Course files live in `courses/lottie/<slug>/bilingual.html` (the EN | ES
  build from the course library). `courses/catalog.json` lists the courses
  that are live and the packs with their role-path tabs.
- Every production deploy runs `scripts/sync-courses.mjs` before the build: it
  uploads the files to the private `courses` storage bucket, publishes the
  courses, badges and packs, and assigns everything to the DEMO team. Preview
  deploys skip it. Run it by hand with `npm run sync-courses` (needs
  `.env.local`).
- To add a course: copy its `bilingual.html` into `courses/lottie/<slug>/`,
  add the slug to `catalog.json` (and to a pack path), and merge to `main`.
- Courses are served through `/play/<slug>/content`, which adds a small script
  (`src/lib/course-hook.ts`) to the top of the file. It keeps each learner's
  saved progress separate on shared devices and posts
  `{ type: "stratlearn:complete", score, lang }` to the player when the learner
  passes the final check. The player then saves the completion, certificate
  and badge (`/api/completions`).
- Demo login: team `DEMO`, name `lottie`, PIN `1234`.

## Course card pictures

Each course card on the learner home shows the course's own Lottie title art
from `public/course-art/<slug>.jpg`. After adding or changing courses, run
`node scripts/make-course-art.mjs` (or pass one slug) to make the pictures,
then commit them. Needs Playwright with Chromium.

## Manager console (`/admin`)

Managers sign in at `/admin/login` with email + password (or an emailed link).
They are Supabase Auth users listed in `staff_members` for their team.
STRATLEARN staff listed in `platform_admins` can open every client team.

- **Overview**: done %, overdue now, progress by role, team code.
- **People**: add one person or paste a list; new PINs show once with
  printable welcome slips. Each person: reset PIN, unlock, new QR badge,
  edit details, turn off, "view as" (their home screen, read-only).
- **Assign training**: a pack (whole or one role path) or one course, to
  everyone, a role, a location or one person, with a due date and an optional
  retraining clock (every 1, 2 or 3 years). Status logic lives in
  `src/lib/status.ts` and is shared with the learner home.
- **Reports**: filterable status table and CSV downloads (status, full
  training records with certificate codes, manager activity log).
- **Print badges**: QR sign-in badges, 8 per letter page.
- **Team settings**: name, team code, sign-in options (text codes off by
  default), roles, locations, managers.

Database changes for the console are in
`supabase/migrations/20261124000001_manager_console.sql` (run it in the
Supabase SQL editor; it is safe to run twice).
