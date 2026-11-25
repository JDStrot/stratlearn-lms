-- Time spent in courses and how many final-check tries a finish took,
-- for the dashboards and audit reports.
-- Add-only: three new columns, nothing dropped or renamed. Safe to run more
-- than once. The app keeps working on the old schema until this runs (it just
-- doesn't record time and tries yet).
-- Failed tries themselves go in course_attempts (kind 'attempt'), added in
-- 20261125000002_client_settings.sql.

-- Running total of active time in a course for the current round (seconds).
-- Moves onto the completion when the course is finished, then starts again at 0.
alter table public.course_progress
  add column if not exists seconds_spent int not null default 0 check (seconds_spent >= 0);

-- Time it took and how many final-check tries it took to finish.
alter table public.completions
  add column if not exists seconds_spent int check (seconds_spent is null or seconds_spent >= 0),
  add column if not exists attempts int check (attempts is null or attempts > 0);
