-- Manager console: sign-in settings per team, pack assignments, worker
-- contact details for the extra sign-in options, and an activity log.
-- Safe to run more than once.

-- Which sign-in options a team offers. Text codes stay off until a client asks.
alter table public.organizations
  add column if not exists login_settings jsonb not null default
    '{"pin":true,"qr":true,"email_password":true,"email_link":true,"google":true,"apple":true,"passkey":true,"tablet":true,"sms":false}'::jsonb;

-- Optional ways for a worker to sign in. None are required: PIN and QR still work.
alter table public.learners
  add column if not exists email        text,
  add column if not exists phone        text,
  add column if not exists employee_id  text,
  -- Supabase Auth account used for email, Google, Apple and text-code sign-in.
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists learners_org_email_idx
  on public.learners (org_id, lower(email)) where email is not null;
create unique index if not exists learners_auth_user_idx
  on public.learners (org_id, auth_user_id) where auth_user_id is not null;

-- Remember when a course came in through a pack, so the console can show and
-- remove the whole pack at once.
alter table public.assignments
  add column if not exists pack_id   uuid references public.packs(id) on delete set null,
  add column if not exists pack_path text;
create index if not exists assignments_pack_idx on public.assignments (org_id, pack_id);

-- Staff display name (email lives in auth.users).
alter table public.staff_members
  add column if not exists display_name text;

-- What managers did, for audits ("who reset this PIN?", "who assigned this?").
create table if not exists public.admin_events (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  action     text not null,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_events_org_idx on public.admin_events (org_id, created_at desc);
alter table public.admin_events enable row level security;
drop policy if exists "staff read events" on public.admin_events;
create policy "staff read events" on public.admin_events
  for select to authenticated using (public.is_org_staff(org_id));

-- Keep the new contact columns readable by staff, never the secrets.
grant select (email, phone, employee_id) on public.learners to authenticated;

-- ---------------------------------------------------------------------------
-- STRATLEARN owner portal (ready for the platform admin view)
-- ---------------------------------------------------------------------------

-- STRATLEARN staff who can see and manage every client team.
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

-- Client account details for the owner portal (billing comes later).
alter table public.organizations
  add column if not exists plan        text not null default 'trial',
  add column if not exists seat_limit  int,
  add column if not exists status      text not null default 'active'
    check (status in ('active', 'paused', 'closed')),
  add column if not exists notes       text;
