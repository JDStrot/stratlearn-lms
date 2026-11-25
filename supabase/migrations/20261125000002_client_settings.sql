-- Client settings: new-hire due windows, reminders and escalation, passing
-- score and tries, certificate branding, state rules, client documents,
-- record retention and scheduled exports, manager scope by location.
-- Add-only: new columns, tables and a private storage bucket. Safe to run
-- more than once. Run 20261125000001_retraining_and_versions.sql first.

-- ---------------------------------------------------------------------------
-- New hires: "due within N days of starting"
-- ---------------------------------------------------------------------------

-- Start date for due windows (falls back to when the person was added).
alter table public.learners
  add column if not exists start_date date;

-- Role/location/team assignments: each person gets N days from the later of
-- the assignment date and their start date, so new hires get a fair window.
alter table public.assignments
  add column if not exists due_within_days int
    check (due_within_days is null or due_within_days between 0 and 365);

-- ---------------------------------------------------------------------------
-- Team-wide settings (one JSON column per area keeps this flexible)
-- ---------------------------------------------------------------------------

alter table public.organizations
  -- Reminders to workers and escalation to managers.
  add column if not exists notify_settings jsonb not null default
    '{"remind_before_days":7,"remind_every_days":7,"escalate_after_days":7,"escalate_to":"managers"}'::jsonb,
  -- Passing score (null = the course's own rule) and tries before a manager must unlock.
  add column if not exists quiz_settings jsonb not null default
    '{"pass_score":null,"max_attempts":null}'::jsonb,
  -- Certificate branding: logo (path in the org-files bucket), signer name and title.
  add column if not exists certificate_settings jsonb not null default
    '{"logo_path":null,"signer_name":null,"signer_title":null}'::jsonb,
  -- Keep records at least this long; scheduled report emails.
  add column if not exists records_settings jsonb not null default
    '{"retention_years":5,"export_frequency":"off","export_emails":[],"last_export_at":null}'::jsonb;

-- ---------------------------------------------------------------------------
-- State rules: which US state each location is in
-- ---------------------------------------------------------------------------

alter table public.locations
  add column if not exists state text check (state is null or state ~ '^[A-Z]{2}$'),
  add column if not exists city  text;

-- ---------------------------------------------------------------------------
-- Manager scope: a manager can be limited to some locations (null = all)
-- ---------------------------------------------------------------------------

alter table public.staff_members
  add column if not exists location_ids uuid[];

-- ---------------------------------------------------------------------------
-- Quiz tries (failed tries and manager unlocks; passes stay in completions)
-- ---------------------------------------------------------------------------

create table if not exists public.course_attempts (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  learner_id     uuid not null references public.learners(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  course_version int,
  -- attempt = a failed try; reset = a manager gave more tries.
  kind           text not null default 'attempt' check (kind in ('attempt', 'reset')),
  score          int check (score is null or score between 0 and 100),
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists course_attempts_idx on public.course_attempts (learner_id, course_id, created_at desc);
alter table public.course_attempts enable row level security;
drop policy if exists "staff read attempts" on public.course_attempts;
create policy "staff read attempts" on public.course_attempts
  for select to authenticated using (public.is_org_staff(org_id));

-- ---------------------------------------------------------------------------
-- Client documents (their own policies and plans, e.g. BBP exposure control plan)
-- ---------------------------------------------------------------------------

create table if not exists public.org_documents (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  title         text not null,
  -- Path inside the private "org-files" bucket.
  storage_path  text not null,
  file_name     text,
  content_type  text,
  size_bytes    int,
  -- Show it with this course (null = team library only).
  course_id     uuid references public.courses(id) on delete set null,
  visible_to_learners boolean not null default true,
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists org_documents_org_idx on public.org_documents (org_id, created_at desc);
alter table public.org_documents enable row level security;
drop policy if exists "staff read documents" on public.org_documents;
create policy "staff read documents" on public.org_documents
  for select to authenticated using (public.is_org_staff(org_id));

-- ---------------------------------------------------------------------------
-- Reminder log, so nobody gets the same reminder twice in a day
-- ---------------------------------------------------------------------------

create table if not exists public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  -- reminder (to a worker), escalation (to managers), export (scheduled report)
  kind       text not null,
  learner_id uuid references public.learners(id) on delete cascade,
  course_id  uuid references public.courses(id) on delete cascade,
  sent_to    text,
  status     text not null default 'sent',
  created_at timestamptz not null default now()
);
create index if not exists notification_log_idx on public.notification_log (org_id, kind, created_at desc);
alter table public.notification_log enable row level security;
drop policy if exists "staff read notifications" on public.notification_log;
create policy "staff read notifications" on public.notification_log
  for select to authenticated using (public.is_org_staff(org_id));

-- Private bucket for client files (served only through the app).
insert into storage.buckets (id, name, public)
values ('org-files', 'org-files', false)
on conflict (id) do nothing;
