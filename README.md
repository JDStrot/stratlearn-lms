# StratLearn LMS

Gamified, bilingual (English | Spanish) training for frontline teams. Learners
sign in with a **PIN** or by scanning a **QR badge**, so nobody needs an email
address. Courses come in packs, and finishing one earns a badge and a
certificate anyone can verify.

This repository is the **foundation**: the app skeleton, the database, learner
login, the course player and completion records. The admin console, reminders,
reports and SCORM export come next.

## What's inside

| Part | Where |
| --- | --- |
| Web app (Next.js, TypeScript, Tailwind) | `src/app` |
| Database tables, security rules, storage bucket | `supabase/migrations` |
| Demo data (team code `DEMO`, name `lottie`, PIN `1234`) | `supabase/seed.sql` |
| Course uploader | `scripts/upload-courses.mjs` |
| Settings template | `.env.example` |

### Pages

- `/` sign in with team code + name + PIN
- `/q/<token>` QR badge sign-in (each learner has a private QR token)
- `/learn` the learner's assigned courses
- `/play/<course>` the course player
- `/verify/<code>` public certificate check

### Database at a glance

- **organizations**: each customer company, with a short **team code** learners type
- **locations**, **job_roles**: for assigning by site and by role
- **staff_members**: owners, admins and managers (email login through Supabase Auth)
- **learners**: frontline staff, PIN (stored hashed, locks for 15 min after 5 wrong tries) and QR token
- **courses**, **packs**, **pack_courses**, **org_packs**: the catalog and which packs a company has
- **assignments**: a course for one learner, a role, a location, or everyone, with a due date and an optional retraining clock (`recurrence_months`)
- **course_progress**, **completions**: where learners are, and what they finished (with course version, score, language)
- **badges**, **learner_badges**: earned badges, each with a share link
- **certificates**: one per completion, with a public verify code

Row level security is on for every table. Learners never talk to the database
directly: the app checks their login cookie and reads data on the server.

## Setup

You need free accounts on **GitHub**, **Supabase** and **Vercel**.

### 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> and click **New project**.
2. Name it `stratlearn`, make up a strong database password (save it in your password manager), pick the region closest to your users, then **Create**.
3. Wait about two minutes for it to finish.

### 2. Create the database tables

1. In Supabase, open **SQL Editor** (left menu) and click **New query**.
2. Open `supabase/migrations/20261123000001_foundation.sql` on GitHub, click the **copy** button, paste it into the editor and press **Run**. You should see "Success. No rows returned".
3. New query again: copy `supabase/seed.sql`, paste, **Run**. This adds a demo company so you can test the login.

### 3. Copy your Supabase keys

In Supabase, open **Project Settings > API Keys** (and **Data API** for the URL). Keep this tab open; you need three values:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role / secret** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this one private)

### 4. Put the app on Vercel

1. Go to <https://vercel.com/new>, choose **Import Git Repository**, and pick `stratlearn-lms` (allow Vercel to see the repo if asked).
2. Before clicking Deploy, open **Environment Variables** and add the four names from `.env.example`:
   - the three Supabase values from step 3
   - `SESSION_SECRET`: a long random string (get one at <https://generate-secret.vercel.app/32>)
3. Click **Deploy**. When it finishes, open the link and sign in with team code `DEMO`, name `lottie`, PIN `1234`.

### 5. Upload courses

The demo course needs its file in storage before it will play. On a computer
with Node.js 20+ and the course folder:

```bash
npm install
cp .env.example .env.local   # then paste your real values into .env.local
npm run upload-courses -- ~/Documents/LMS/courses slips-trips-falls
```

Leave off the course name to upload every course folder.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
npm run lint && npm run typecheck && npm run build
```

## Course completion hook

The player listens for one message from the course page when the learner
finishes:

```js
window.parent.postMessage({ type: "stratlearn:complete", score: 92, lang: "en" }, "*");
```

`score` (0-100) and `lang` are optional. The app then saves the completion,
issues a certificate and awards the course's badge (if a badge row exists for
that course). The Lottie course player does not send this yet; adding it to
the shared course build is the next step.

## Course files and versions

Course HTML lives in the private Supabase Storage bucket `courses` at
`lottie/<course>/v<version>/bilingual.html` and is served only to signed-in
learners who have the course assigned. Before launch, uploads replace files in
place. After launch, raise `courses.version` before uploading changes so past
completions keep pointing at the version the learner took. Moving files to
Cloudflare R2 later only means changing where `src/app/play/[slug]/content/route.ts`
reads from.
