-- Face ID / fingerprint (passkeys) for learners. Safe to run more than once.
create table if not exists public.learner_passkeys (
  id            text primary key,              -- credential id (base64url)
  learner_id    uuid not null references public.learners(id) on delete cascade,
  public_key    text not null,                 -- base64url
  counter       bigint not null default 0,
  transports    text[] not null default '{}',
  device_name   text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists learner_passkeys_learner_idx on public.learner_passkeys (learner_id);
-- Server-only (service role). No policies, so the public API can't read it.
alter table public.learner_passkeys enable row level security;
