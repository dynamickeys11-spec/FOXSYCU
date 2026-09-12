-- FOXSYCU: richer customer profile metadata for a realistic banking profile.
-- Demo-only application data; no government ID numbers or sensitive verification data are stored.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists date_of_birth date,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state_region text,
  add column if not exists postal_code text,
  add column if not exists country text default 'United States',
  add column if not exists occupation text,
  add column if not exists employment_status text,
  add column if not exists preferred_name text,
  add column if not exists timezone text default 'America/New_York',
  add column if not exists profile_completed boolean not null default false;

create index if not exists profiles_country_idx on public.profiles(country);

-- Keep profile ownership explicit and allow the authenticated customer to maintain their own details.
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
