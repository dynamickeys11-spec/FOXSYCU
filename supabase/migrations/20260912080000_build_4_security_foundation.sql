create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_events_user_created_idx on public.security_events(user_id, created_at desc);
alter table public.security_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='security_events' and policyname='security_events_select_own') then
    create policy security_events_select_own on public.security_events for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='security_events' and policyname='security_events_insert_own') then
    create policy security_events_insert_own on public.security_events for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
end $$;

create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  device_fingerprint text not null,
  last_seen_at timestamptz not null default now(),
  trusted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, device_fingerprint)
);
create index if not exists trusted_devices_user_idx on public.trusted_devices(user_id, last_seen_at desc);
alter table public.trusted_devices enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trusted_devices' and policyname='trusted_devices_select_own') then
    create policy trusted_devices_select_own on public.trusted_devices for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trusted_devices' and policyname='trusted_devices_insert_own') then
    create policy trusted_devices_insert_own on public.trusted_devices for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trusted_devices' and policyname='trusted_devices_update_own') then
    create policy trusted_devices_update_own on public.trusted_devices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trusted_devices' and policyname='trusted_devices_delete_own') then
    create policy trusted_devices_delete_own on public.trusted_devices for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
end $$;
