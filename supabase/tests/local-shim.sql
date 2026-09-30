-- local-shim.sql — the smallest possible stand-in for Supabase's own objects, so
-- the migrations and the policy suite can be verified on a plain Postgres with no
-- Supabase project and no account.
--
-- It creates only what the migrations actually depend on:
--   * the `auth` schema, `auth.users`, and `auth.uid()` reading the JWT claim the
--     way PostgREST sets it (`request.jwt.claims`);
--   * the `anon` and `authenticated` roles PostgREST switches into.
--
-- This file is a TEST FIXTURE. It never runs against a real project, where all of
-- these already exist and are owned by Supabase.

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Exactly how Supabase defines it: the `sub` claim of the request's JWT, or NULL
-- when there is no session. Everything in 0002_rls.sql hangs off this.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;

-- Supabase grants the API roles broad table privileges by default, and RLS is what
-- constrains them. Reproduce that starting point, so 0002's revoke has something
-- to revoke and a policy failure cannot be mistaken for a missing grant.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
