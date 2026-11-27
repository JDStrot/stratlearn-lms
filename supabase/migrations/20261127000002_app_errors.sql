-- Error alerts: every server or browser error the app catches is saved here,
-- and the owner gets an email the first time each kind of error shows up in an
-- hour (at most 20 alert emails a day). Owner portal > Errors lists them.
-- Add-only: nothing dropped or renamed. Safe to run more than once.
-- Only the app's server (service role) reads and writes it; row level security
-- is on with no policies, so nobody can reach it with the public key.

create table if not exists public.app_errors (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  -- server = a page or API call failed; browser = a screen crashed on someone's
  -- device; course = a course file had a script error; cron = the daily job.
  source      text not null check (source in ('server','browser','course','cron')),
  -- Same kind of error = same signature (source + message + where), so repeats group together.
  signature   text not null check (char_length(signature) <= 200),
  message     text not null check (char_length(message) <= 2000),
  path        text check (path is null or char_length(path) <= 500),
  details     jsonb,
  alerted     boolean not null default false
);

create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
create index if not exists app_errors_signature_idx on public.app_errors (signature, created_at desc);

alter table public.app_errors enable row level security;
