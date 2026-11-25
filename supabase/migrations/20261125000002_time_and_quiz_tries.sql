-- Time spent in courses and final-check tries, for the dashboards and audit reports.
-- Add-only: new columns and one new table, nothing dropped or renamed. Safe to
-- run more than once. The app keeps working on the old schema until this runs
-- (it simply doesn't record time and tries yet).

-- Running total of active time in a course for the current round (seconds).
-- Moves onto the completion when the course is finished, then starts again at 0.
alter table public.course_progress
  add column if not exists seconds_spent int not null default 0 check (seconds_spent >= 0);

-- Time it took and how many final-check tries it took to finish.
alter table public.completions
  add column if not exists seconds_spent int check (seconds_spent is null or seconds_spent >= 0),
  add column if not exists attempts int check (attempts is null or attempts > 0);

-- Every final-check try, passed or not, with its score.
create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  learner_id   uuid not null references public.learners(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  score        int check (score is null or score between 0 and 100),
  passed       boolean not null default false,
  language     text check (language in ('en','es')),
  attempted_at timestamptz not null default now()
);
create index if not exists quiz_attempts_org_idx on public.quiz_attempts (org_id, attempted_at desc);
create index if not exists quiz_attempts_learner_idx on public.quiz_attempts (learner_id, course_id, attempted_at desc);

alter table public.quiz_attempts enable row level security;
drop policy if exists "staff read quiz attempts" on public.quiz_attempts;
create policy "staff read quiz attempts" on public.quiz_attempts
  for select to authenticated using (public.is_org_staff(org_id));
