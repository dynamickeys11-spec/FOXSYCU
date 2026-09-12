create extension if not exists pgcrypto;

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  unique(user_id, code_hash)
);

alter table public.mfa_recovery_codes enable row level security;
revoke all on table public.mfa_recovery_codes from anon, authenticated;

drop function if exists public.issue_mfa_recovery_codes();
drop function if exists public.has_mfa_recovery_grant(text);
drop function if exists public.consume_mfa_recovery_code(text);
drop function if exists public.get_mfa_recovery_status();

create or replace function public.issue_mfa_recovery_codes()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); codes text[] := '{}'; code text; i integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  delete from public.mfa_recovery_codes where user_id = uid;
  for i in 1..10 loop
    code := upper(encode(gen_random_bytes(5), 'hex'));
    codes := array_append(codes, code);
    insert into public.mfa_recovery_codes(user_id, code_hash)
      values(uid, encode(digest(code, 'sha256'),'hex'));
  end loop;
  return jsonb_build_object('codes', to_jsonb(codes), 'total', 10, 'unused', 10);
end $$;

create or replace function public.get_mfa_recovery_status()
returns jsonb language sql security definer set search_path = public, pg_temp as $$
select jsonb_build_object('total', count(*), 'unused', count(*) filter (where used_at is null))
from public.mfa_recovery_codes where user_id = auth.uid();
$$;

create or replace function public.has_mfa_recovery_grant(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('valid', false); end if;
  return jsonb_build_object('valid', exists(
    select 1 from public.mfa_recovery_codes
    where user_id=uid and used_at is null
      and code_hash=encode(digest(upper(trim(p_token)), 'sha256'),'hex')
  ));
end $$;

create or replace function public.consume_mfa_recovery_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); rid uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  update public.mfa_recovery_codes
  set used_at=now()
  where id=(
    select id from public.mfa_recovery_codes
    where user_id=uid and used_at is null
      and code_hash=encode(digest(upper(trim(p_code)), 'sha256'),'hex')
    for update skip locked limit 1
  ) returning id into rid;
  return jsonb_build_object('valid', rid is not null, 'consumed', rid is not null);
end $$;

grant execute on function public.issue_mfa_recovery_codes() to authenticated;
grant execute on function public.get_mfa_recovery_status() to authenticated;
grant execute on function public.has_mfa_recovery_grant(text) to authenticated;
grant execute on function public.consume_mfa_recovery_code(text) to authenticated;
revoke execute on function public.issue_mfa_recovery_codes() from anon;
revoke execute on function public.get_mfa_recovery_status() from anon;
revoke execute on function public.has_mfa_recovery_grant(text) from anon;
revoke execute on function public.consume_mfa_recovery_code(text) from anon;
