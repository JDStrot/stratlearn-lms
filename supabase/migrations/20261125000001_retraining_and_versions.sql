-- Retraining clocks and course versions.
-- Add-only: new columns and tables, nothing dropped or renamed. Safe to run
-- more than once. The app keeps working on the old schema until this runs.

-- ---------------------------------------------------------------------------
-- 1. Retraining clocks
-- ---------------------------------------------------------------------------

-- The course's own default: null = never needs redoing (most courses),
-- 12 = yearly, 24 = every 2 years. Set in the owner portal course library.
alter table public.courses
  add column if not exists default_recurrence_months int
    check (default_recurrence_months is null or default_recurrence_months > 0),
  -- Why it repeats, shown to managers ("CA law: every 2 years").
  add column if not exists recurrence_note text;

-- A client team's own rule for a course, set by its manager or the owner.
-- A row here beats the course default. recurrence_months null = never.
create table if not exists public.org_course_settings (
  org_id            uuid not null references public.organizations(id) on delete cascade,
  course_id         uuid not null references public.courses(id) on delete cascade,
  recurrence_months int check (recurrence_months is null or recurrence_months > 0),
  updated_by        uuid references auth.users(id) on delete set null,
  updated_at        timestamptz not null default now(),
  primary key (org_id, course_id)
);
alter table public.org_course_settings enable row level security;
drop policy if exists "staff read course settings" on public.org_course_settings;
create policy "staff read course settings" on public.org_course_settings
  for select to authenticated using (public.is_org_staff(org_id));

-- An assignment either follows the team/course rule (false, the default for
-- new assignments) or has its own repeat set by the manager (true).
alter table public.assignments
  add column if not exists recurrence_custom boolean not null default false;
-- Assignments made before this change that picked a repeat keep it.
update public.assignments set recurrence_custom = true
  where recurrence_months is not null and recurrence_custom = false;

-- "Have them take it again": completions before this moment don't count for
-- this assignment (old records and certificates stay on file).
alter table public.assignments
  add column if not exists retake_after timestamptz;

-- Team-wide timing: default due days for new assignments, grace days before
-- a late course counts as overdue, and how early a retrain shows up.
alter table public.organizations
  add column if not exists training_settings jsonb not null default
    '{"default_due_days":30,"grace_days":0,"retrain_notice_days":30}'::jsonb;

-- Starting defaults (only where the law, or STRATLEARN policy, says to redo
-- the training). Only fills courses that have no default yet.
update public.courses c set default_recurrence_months = d.months, recurrence_note = d.note
from (values
  ('harassment-prevention',               12, 'Best practice: yearly (STRATLEARN refreshes it every year)'),
  ('harassment-prevention-ca',            24, 'California law: every 2 years'),
  ('harassment-prevention-ca-supervisors',24, 'California law: every 2 years'),
  ('harassment-prevention-ny',            12, 'New York law: every year'),
  ('harassment-prevention-nyc',           12, 'New York law: every year'),
  ('harassment-prevention-il',            12, 'Illinois law: every year'),
  ('harassment-prevention-il-restaurants',12, 'Illinois law: every year'),
  ('harassment-prevention-ct',           120, 'Connecticut law: refresher at least every 10 years'),
  ('workplace-violence-ca',               12, 'California SB 553: every year'),
  ('workplace-violence-ny-retail',        12, 'New York Retail Worker Safety Act: check current rule (set to yearly to be safe)'),
  ('workplace-violence-healthcare',       12, 'State healthcare violence laws: yearly in most states'),
  ('bloodborne-pathogens',                12, 'OSHA 1910.1030: every year'),
  ('bloodborne-pathogens-yearly',         12, 'OSHA 1910.1030: every year'),
  ('respiratory-protection-yearly',       12, 'OSHA 1910.134: every year'),
  ('hearing-conservation-yearly',         12, 'OSHA 1910.95: every year'),
  ('fire-safety',                         12, 'OSHA 1910.157: fire extinguisher training every year'),
  ('mandated-reporter-yearly',            12, 'Yearly (e.g. California schools)'),
  ('asbestos-awareness',                  12, 'OSHA asbestos standards: every year')
) as d(slug, months, note)
where c.slug = d.slug and c.default_recurrence_months is null;

-- ---------------------------------------------------------------------------
-- 2. Course versions (archive)
-- ---------------------------------------------------------------------------

-- Every version a course has had. Old files stay in storage at their own
-- path (lottie/<slug>/v<n>/bilingual.html), so nothing a learner finished is
-- ever lost. Completions already record course_version; certificates point
-- at the completion, so records survive every new version.
create table if not exists public.course_versions (
  course_id    uuid not null references public.courses(id) on delete cascade,
  version      int not null check (version > 0),
  storage_path text,
  -- Fingerprint of the file, so a deploy can tell when the content changed.
  content_hash text,
  notes        text,
  published_at timestamptz not null default now(),
  primary key (course_id, version)
);
alter table public.course_versions enable row level security;
drop policy if exists "course versions are public" on public.course_versions;
create policy "course versions are public" on public.course_versions
  for select using (true);

-- Record the version every course is on today.
insert into public.course_versions (course_id, version, storage_path, published_at)
select id, version, storage_path, coalesce(updated_at, created_at) from public.courses
on conflict (course_id, version) do nothing;
