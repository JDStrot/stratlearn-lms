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
