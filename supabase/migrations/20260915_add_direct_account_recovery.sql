create extension if not exists pgcrypto;

create table if not exists public.direct_account_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  ip_address inet
);

create index if not exists direct_account_recovery_codes_user_idx on public.direct_account_recovery_codes(user_id, created_at desc);
alter table public.direct_account_recovery_codes enable row level security;
revoke all on public.direct_account_recovery_codes from anon, authenticated;

create table if not exists public.direct_account_recovery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null check (action in ('issued','reset_failed','reset_succeeded')),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet
);
alter table public.direct_account_recovery_events enable row level security;
revoke all on public.direct_account_recovery_events from anon, authenticated;
grant all on public.direct_account_recovery_codes to service_role;
grant all on public.direct_account_recovery_events to service_role;

create or replace function public.direct_recovery_lookup_user(p_email text)
returns uuid language sql security definer set search_path = '' stable as $$
  select u.id from auth.users u
  where lower(u.email)=lower(trim(p_email))
    and exists (select 1 from auth.identities i where i.user_id=u.id and i.provider='email')
    and not exists (select 1 from auth.identities i where i.user_id=u.id and i.provider <> 'email')
  limit 1;
$$;
revoke all on function public.direct_recovery_lookup_user(text) from public, anon, authenticated;
grant execute on function public.direct_recovery_lookup_user(text) to service_role;

create or replace function public.direct_recovery_consume_code(p_user_id uuid,p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.direct_account_recovery_codes
  where user_id=p_user_id and used_at is null and expires_at>now() and failed_attempts<5
    and code_hash=encode(extensions.digest(p_code,'sha256'),'hex')
  order by created_at desc limit 1 for update;
  if v_id is null then
    update public.direct_account_recovery_codes set failed_attempts=failed_attempts+1
    where user_id=p_user_id and used_at is null and expires_at>now() and failed_attempts<5;
    return false;
  end if;
  update public.direct_account_recovery_codes set used_at=now() where id=v_id;
  return true;
end;
$$;
revoke all on function public.direct_recovery_consume_code(uuid,text) from public, anon, authenticated;
grant execute on function public.direct_recovery_consume_code(uuid,text) to service_role;

create or replace function public.log_direct_recovery_event(p_user_id uuid,p_action text,p_metadata jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.direct_account_recovery_events(user_id,action,metadata)
  values(p_user_id,p_action,coalesce(p_metadata,'{}'::jsonb));
$$;
revoke all on function public.log_direct_recovery_event(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.log_direct_recovery_event(uuid,text,jsonb) to service_role;
