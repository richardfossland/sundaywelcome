-- SundayWelcome migration 0001 — `welcome` schema (newcomer follow-up for
-- churches).
--
-- Lives in the SundayPlan Supabase project: tenancy (public.church,
-- public.church_member, auth.users) is REUSED, not duplicated here. Every row
-- carries church_id, so each congregation with a Sunday Account only ever sees
-- its own newcomers. Idempotent: safe to re-run.
--
-- Security model (suite convention): RLS enabled on every table with ZERO
-- policies — no anon/authenticated access to the tables at all. Every read and
-- write goes through Next API routes using the service role. The PUBLIC connect
-- form is unauthenticated but still writes via the service role (POST
-- /api/connect), so anon never touches Postgres directly.
--
-- After applying you MUST:
--   1. EXPOSE the `welcome` schema in the Supabase dashboard
--      (Settings → API → Exposed schemas) — exposure cannot be set via SQL.
--   2. If SSO grants are enabled in SundayPlan, extend the `app_grant`
--      constraint there to include 'welcome'.

create extension if not exists pgcrypto;

create schema if not exists welcome;

-- Explicit grants: a non-public schema gets nothing by default (learned the
-- hard way on harvest/market/info). Only service_role may touch it.
grant usage on schema welcome to service_role;

-- ── Members (who may follow up; suite membership lives in public.church_member)
create table if not exists welcome.member (
  church_id  uuid not null references public.church(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','follower')),
  created_at timestamptz not null default now(),
  primary key (church_id, user_id)
);
create index if not exists member_user_idx on welcome.member (user_id);

-- ── Settings (per-church configuration of the public connect form) ──────────
create table if not exists welcome.settings (
  church_id        uuid primary key references public.church(id) on delete cascade,
  form_enabled     boolean not null default true,
  headline         text not null default 'Velkommen!'
                     check (char_length(headline) between 1 and 120),
  intro            text not null default 'Så fint at du er her. Legg igjen navnet ditt, så tar vi kontakt.'
                     check (char_length(intro) <= 1000),
  ask_phone        boolean not null default true,
  ask_visitor_type boolean not null default true,
  -- [{ "key": "...", "label": "..." }, ...] — the interest checkboxes offered.
  interests        jsonb not null default
                     '[{"key":"smaagruppe","label":"Smågruppe / fellesskap"},
                       {"key":"barn","label":"Barn og familie"},
                       {"key":"ungdom","label":"Ungdom"},
                       {"key":"frivillig","label":"Bli frivillig"},
                       {"key":"samtale","label":"En samtale / forbønn"},
                       {"key":"nyhetsbrev","label":"Nyhetsbrev på e-post"}]'::jsonb,
  thank_you        text not null default 'Takk! Vi tar kontakt med deg snart.'
                     check (char_length(thank_you) <= 1000),
  updated_at       timestamptz not null default now()
);

-- ── Connections (the newcomer cards) ───────────────────────────────────────
create table if not exists welcome.connection (
  id           uuid primary key default gen_random_uuid(),
  church_id    uuid not null references public.church(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  email        text check (email is null or char_length(email) <= 200),
  phone        text check (phone is null or char_length(phone) <= 40),
  -- At least one reachable contact is required (also enforced in the API).
  constraint connection_has_contact check (email is not null or phone is not null),
  visitor_type text check (
    visitor_type is null
    or visitor_type in ('first_time','returning','new_to_area','member','other')
  ),
  interests    text[] not null default '{}',
  message      text not null default '' check (char_length(message) <= 2000),
  status       text not null default 'new'
                 check (status in ('new','assigned','contacted','done','archived')),
  assigned_to  uuid references auth.users(id) on delete set null,
  source       text not null default 'web',
  -- GDPR: the visitor ticked an explicit consent box; stamp when.
  consent_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists connection_church_idx
  on welcome.connection (church_id, created_at desc);
create index if not exists connection_status_idx
  on welcome.connection (church_id, status);
create index if not exists connection_assigned_idx
  on welcome.connection (assigned_to) where assigned_to is not null;

-- ── Notes (follow-up log on a card) ────────────────────────────────────────
create table if not exists welcome.note (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references welcome.connection(id) on delete cascade,
  -- Denormalised church_id so a note can be scoped/authorised without a join.
  church_id     uuid not null references public.church(id) on delete cascade,
  author_id     uuid references auth.users(id) on delete set null,
  body          text not null check (char_length(body) between 1 and 4000),
  created_at    timestamptz not null default now()
);
create index if not exists note_connection_idx
  on welcome.note (connection_id, created_at);

-- ── Lock down: RLS on (zero policies) + service_role-only grants ────────────
alter table welcome.member     enable row level security;
alter table welcome.settings   enable row level security;
alter table welcome.connection enable row level security;
alter table welcome.note       enable row level security;

grant all on all tables in schema welcome to service_role;
alter default privileges in schema welcome grant all on tables to service_role;
