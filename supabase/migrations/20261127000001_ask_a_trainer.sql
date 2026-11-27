-- Ask a trainer: each team names a safety trainer and an HR trainer; workers
-- send questions from courses that need one (California harassment, New York,
-- Connecticut, Bloodborne Pathogens, OSHA topics) and get an answer in the app
-- and by email. Add-only: nothing dropped or renamed. Safe to run more than once.
-- Only the app's server (service role) reads and writes the new table; row
-- level security is on with no policies, so nobody can reach it with the public key.

-- The two trainers (name, title, qualifications, email, phone, hours).
alter table public.organizations add column if not exists trainer_settings jsonb not null default '{}'::jsonb;

-- Who the trainer was when someone finished, kept with the training record.
alter table public.completions add column if not exists trainer_snapshot jsonb;

create table if not exists public.trainer_questions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  learner_id      uuid not null references public.learners(id) on delete cascade,
  course_id       uuid references public.courses(id) on delete set null,
  topic           text not null default 'safety' check (topic in ('safety','hr')),
  question        text not null check (char_length(question) between 1 and 2000),
  lang            text not null default 'en' check (lang in ('en','es')),
  -- Secret for the trainer's "answer" link in the email (no sign-in needed).
  token           text not null unique,
  -- Who it went to, as sent (name, email).
  sent_to         jsonb,
  answer          text check (answer is null or char_length(answer) <= 4000),
  answered_at     timestamptz,
  answered_by     text check (answered_by is null or char_length(answered_by) <= 200),
  reminded_at     timestamptz,
  escalated_at    timestamptz,
  learner_seen_at timestamptz,
  status          text not null default 'open' check (status in ('open','answered'))
);

create index if not exists trainer_questions_org_idx on public.trainer_questions (org_id, status, created_at desc);
create index if not exists trainer_questions_learner_idx on public.trainer_questions (learner_id, course_id);

alter table public.trainer_questions enable row level security;
