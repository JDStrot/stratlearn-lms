-- StratLearn LMS foundation schema
-- Learners sign in with a PIN or a QR badge (no email). Staff (owners, admins,
-- managers) use Supabase Auth. All learner traffic goes through the Next.js
-- server with the service role key, so learner tables have no public policies.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Organizations and people
-- ---------------------------------------------------------------------------

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Short code learners type on the login screen, e.g. "SUNNYGYM".
  join_code   text not null unique check (join_code ~ '^[A-Z0-9]{4,16}$'),
  default_language text not null default 'en' check (default_language in ('en','es')),
  created_at  timestamptz not null default now()
);

create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

-- Job roles drive "assign by role" (front desk, trainer, cook, ...).
create table public.job_roles (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create type public.staff_role as enum ('owner', 'admin', 'manager');

-- Staff accounts (email login through Supabase Auth).
create table public.staff_members (
  user_id    uuid not null references auth.users(id) on delete cascade,
  org_id     uuid not null references public.organizations(id) on delete cascade,
  role       public.staff_role not null default 'manager',
  location_id uuid references public.locations(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

-- Frontline learners. No email required.
create table public.learners (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  display_name        text not null,
  -- What the learner types to sign in (first name + last initial, employee #, ...).
  username            text not null,
  pin_hash            text,
  -- Secret printed inside the learner's QR badge. Rotate to revoke a badge.
  qr_token            text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  preferred_language  text not null default 'en' check (preferred_language in ('en','es')),
  job_role_id         uuid references public.job_roles(id) on delete set null,
  location_id         uuid references public.locations(id) on delete set null,
  is_active           boolean not null default true,
  failed_pin_attempts int not null default 0,
  locked_until        timestamptz,
  last_login_at       timestamptz,
  created_at          timestamptz not null default now()
);
create unique index learners_org_username_idx on public.learners (org_id, lower(username));

-- ---------------------------------------------------------------------------
-- Catalog: courses and packs (shared across all organizations)
-- ---------------------------------------------------------------------------

create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title        text not null,
  title_es     text,
  description  text,
  -- lottie = off-the-shelf series, stratlearn = future mature series,
  -- popflow / washdrops = client packages with their own universes.
  series       text not null default 'lottie' check (series in ('lottie','stratlearn','popflow','washdrops')),
  format       text not null default 'html' check (format in ('html','scorm12')),
  minutes      int,
  languages    text[] not null default '{en,es}',
  -- Path inside the "courses" storage bucket, e.g. "lottie/slips-trips-falls/v1/bilingual.html".
  storage_path text,
  version      int not null default 1,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.packs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title       text not null,
  title_es    text,
  description text,
  industry    text,
  is_published boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.pack_courses (
  pack_id   uuid not null references public.packs(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  -- Role-path tab inside the pack ("core", "trainers", "front desk", "leads", ...).
  path      text not null default 'core',
  position  int not null default 0,
  required  boolean not null default false,
  primary key (pack_id, course_id, path)
);

-- Which packs an organization has bought / switched on.
create table public.org_packs (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  pack_id    uuid not null references public.packs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (org_id, pack_id)
);

-- ---------------------------------------------------------------------------
-- Assignments, progress, completions
-- ---------------------------------------------------------------------------

-- Target one learner, a job role, a location, or (all null) the whole org.
create table public.assignments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  course_id       uuid not null references public.courses(id) on delete cascade,
  learner_id      uuid references public.learners(id) on delete cascade,
  job_role_id     uuid references public.job_roles(id) on delete cascade,
  location_id     uuid references public.locations(id) on delete cascade,
  due_at          timestamptz,
  -- Retraining clock, e.g. 12 = yearly, 24 = every two years.
  recurrence_months int check (recurrence_months is null or recurrence_months > 0),
  assigned_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index assignments_org_idx on public.assignments (org_id);

-- Saved place inside a course so learners can resume on any device.
create table public.course_progress (
  learner_id uuid not null references public.learners(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  percent    int not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (learner_id, course_id)
);

create table public.completions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations(id) on delete cascade,
  learner_id     uuid not null references public.learners(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  course_version int not null,
  language       text check (language in ('en','es')),
  score          int check (score is null or score between 0 and 100),
  completed_at   timestamptz not null default now()
);
create index completions_learner_idx on public.completions (learner_id, course_id, completed_at desc);
create index completions_org_idx on public.completions (org_id, completed_at desc);

-- ---------------------------------------------------------------------------
-- Badges and certificates
-- ---------------------------------------------------------------------------

create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  name_es     text,
  description text,
  image_path  text,
  -- Earned by finishing this course (null = special badge such as a streak).
  course_id   uuid references public.courses(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.learner_badges (
  learner_id  uuid not null references public.learners(id) on delete cascade,
  badge_id    uuid not null references public.badges(id) on delete cascade,
  earned_at   timestamptz not null default now(),
  -- Public link for sharing the badge on social media.
  share_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  primary key (learner_id, badge_id)
);

create table public.certificates (
  id            uuid primary key default gen_random_uuid(),
  completion_id uuid not null unique references public.completions(id) on delete cascade,
  org_id        uuid not null references public.organizations(id) on delete cascade,
  learner_id    uuid not null references public.learners(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  -- Printed on the certificate; anyone can check it on /verify/<code>.
  verify_code   text not null unique default upper(encode(extensions.gen_random_bytes(5), 'hex')),
  issued_at     timestamptz not null default now(),
  expires_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Set or change a learner's PIN (4 to 8 digits). Server-only.
create or replace function public.set_learner_pin(p_learner_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must be 4 to 8 digits';
  end if;
  update public.learners
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
         failed_pin_attempts = 0,
         locked_until = null
   where id = p_learner_id;
end;
$$;

-- Check a PIN login. Locks the learner for 15 minutes after 5 wrong tries.
-- Returns the learner row id and org id, or nothing when the login fails.
create or replace function public.verify_learner_pin(p_join_code text, p_username text, p_pin text)
returns table (learner_id uuid, org_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  l public.learners%rowtype;
begin
  select lr.* into l
    from public.learners lr
    join public.organizations o on o.id = lr.org_id
   where o.join_code = upper(trim(p_join_code))
     and lower(lr.username) = lower(trim(p_username))
     and lr.is_active
   for update of lr;

  if not found or l.pin_hash is null then
    return;
  end if;

  if l.locked_until is not null and l.locked_until > now() then
    return;
  end if;

  if l.pin_hash = extensions.crypt(p_pin, l.pin_hash) then
    update public.learners
       set failed_pin_attempts = 0, locked_until = null, last_login_at = now()
     where id = l.id;
    learner_id := l.id;
    org_id := l.org_id;
    return next;
  else
    update public.learners
       set failed_pin_attempts = failed_pin_attempts + 1,
           locked_until = case when failed_pin_attempts + 1 >= 5
                               then now() + interval '15 minutes' end
     where id = l.id;
  end if;
end;
$$;

revoke all on function public.set_learner_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.verify_learner_pin(text, text, text) from public, anon, authenticated;
grant execute on function public.set_learner_pin(uuid, text) to service_role;
grant execute on function public.verify_learner_pin(text, text, text) to service_role;

-- True when the signed-in staff user belongs to the organization.
create or replace function public.is_org_staff(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
     where user_id = auth.uid() and org_id = p_org_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.organizations   enable row level security;
alter table public.locations       enable row level security;
alter table public.job_roles       enable row level security;
alter table public.staff_members   enable row level security;
alter table public.learners        enable row level security;
alter table public.courses         enable row level security;
alter table public.packs           enable row level security;
alter table public.pack_courses    enable row level security;
alter table public.org_packs       enable row level security;
alter table public.assignments     enable row level security;
alter table public.course_progress enable row level security;
alter table public.completions     enable row level security;
alter table public.badges          enable row level security;
alter table public.learner_badges  enable row level security;
alter table public.certificates    enable row level security;

-- Published catalog is readable by anyone.
create policy "published courses are public" on public.courses
  for select using (is_published);
create policy "published packs are public" on public.packs
  for select using (is_published);
create policy "pack contents are public" on public.pack_courses
  for select using (true);
create policy "badges are public" on public.badges
  for select using (true);

-- Staff can read their own organization's data (read-only for now; the
-- admin console will add write policies).
create policy "staff read own org" on public.organizations
  for select to authenticated using (public.is_org_staff(id));
create policy "staff read own membership" on public.staff_members
  for select to authenticated using (user_id = auth.uid());
create policy "staff read locations" on public.locations
  for select to authenticated using (public.is_org_staff(org_id));
create policy "staff read job roles" on public.job_roles
  for select to authenticated using (public.is_org_staff(org_id));
create policy "staff read learners" on public.learners
  for select to authenticated using (public.is_org_staff(org_id));
create policy "staff read org packs" on public.org_packs
  for select to authenticated using (public.is_org_staff(org_id));
create policy "staff read assignments" on public.assignments
  for select to authenticated using (public.is_org_staff(org_id));
create policy "staff read completions" on public.completions
  for select to authenticated using (public.is_org_staff(org_id));
create policy "staff read certificates" on public.certificates
  for select to authenticated using (public.is_org_staff(org_id));
create policy "staff read progress" on public.course_progress
  for select to authenticated using (
    exists (select 1 from public.learners l
             where l.id = learner_id and public.is_org_staff(l.org_id)));
create policy "staff read learner badges" on public.learner_badges
  for select to authenticated using (
    exists (select 1 from public.learners l
             where l.id = learner_id and public.is_org_staff(l.org_id)));

-- Hide QR secrets and PIN hashes from staff reads through the API.
revoke select on public.learners from anon, authenticated;
grant select (id, org_id, display_name, username, preferred_language, job_role_id,
              location_id, is_active, failed_pin_attempts, locked_until,
              last_login_at, created_at)
  on public.learners to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for course files (private; served through the app)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('courses', 'courses', false)
on conflict (id) do nothing;
