-- Contact Us form: feedback, improvement ideas and course problem reports.
-- Add-only: one new table, nothing dropped or renamed. Safe to run more than once.
-- Only the app's server (service role) reads and writes it; row level security
-- is on with no policies, so nobody can reach it with the public key.

create table if not exists public.feedback_messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  kind          text not null default 'feedback' check (kind in ('feedback','idea','course_issue','other')),
  course_id     uuid references public.courses(id) on delete set null,
  message       text not null check (char_length(message) between 1 and 4000),
  name          text check (name is null or char_length(name) <= 120),
  contact       text check (contact is null or char_length(contact) <= 200),
  -- Who sent it, when they were signed in (blank for visitors).
  learner_id    uuid references public.learners(id) on delete set null,
  org_id        uuid references public.organizations(id) on delete set null,
  staff_user_id uuid references auth.users(id) on delete set null,
  page          text check (page is null or char_length(page) <= 500),
  status        text not null default 'new' check (status in ('new','done')),
  handled_at    timestamptz
);

create index if not exists feedback_messages_created_idx on public.feedback_messages (created_at desc);
create index if not exists feedback_messages_status_idx on public.feedback_messages (status);

alter table public.feedback_messages enable row level security;
