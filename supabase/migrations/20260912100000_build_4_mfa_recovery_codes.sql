create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists mfa_recovery_codes_user_idx on public.mfa_recovery_codes(user_id, created_at desc);

alter table public.mfa_recovery_codes enable row level security;

drop policy if exists mfa_recovery_codes_select_own on public.mfa_recovery_codes;
create policy mfa_recovery_codes_select_own on public.mfa_recovery_codes for select to authenticated using (user_id = auth.uid());

create table if not exists public.mfa_recovery_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mfa_recovery_grants_user_idx on public.mfa_recovery_grants(user_id, expires_at desc);

alter table public.mfa_recovery_grants enable row level security;

drop policy if exists mfa_recovery_grants_select_own on public.mfa_recovery_grants;
create policy mfa_recovery_grants_select_own on public.mfa_recovery_grants for select to authenticated using (user_id = auth.uid());

create or replace function public.issue_mfa_recovery_codes()
returns table(code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  i integer;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  delete from public.mfa_recovery_codes where user_id = v_user and used_at is null;
  for i in 1..10 loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 12));
    insert into public.mfa_recovery_codes(user_id, code_hash) values (v_user, encode(extensions.digest(v_code::bytea, 'sha256'), 'hex'));
    code := v_code;
    return next;
  end loop;
end;
$$;

create or replace function public.consume_mfa_recovery_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_token text;
  v_expires timestamptz := now() + interval '15 minutes';
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  select id into v_id from public.mfa_recovery_codes
  where user_id = v_user and used_at is null and code_hash = encode(extensions.digest(upper(trim(p_code))::bytea, 'sha256'), 'hex')
  order by created_at desc limit 1 for update;
  if v_id is null then return jsonb_build_object('valid', false); end if;
  update public.mfa_recovery_codes set used_at = now() where id = v_id;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.mfa_recovery_grants(user_id, token_hash, expires_at)
  values (v_user, encode(extensions.digest(v_token::bytea, 'sha256'), 'hex'), v_expires);
  return jsonb_build_object('valid', true, 'token', v_token, 'expires_at', v_expires);
end;
$$;

create or replace function public.has_mfa_recovery_grant(p_token text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.mfa_recovery_grants
    where user_id = auth.uid()
      and expires_at > now()
      and token_hash = encode(extensions.digest(coalesce(p_token, '')::bytea, 'sha256'), 'hex')
  );
$$;

revoke all on function public.issue_mfa_recovery_codes() from public, anon;
grant execute on function public.issue_mfa_recovery_codes() to authenticated;
revoke all on function public.consume_mfa_recovery_code(text) from public, anon;
grant execute on function public.consume_mfa_recovery_code(text) to authenticated;
revoke all on function public.has_mfa_recovery_grant(text) from public, anon;
grant execute on function public.has_mfa_recovery_grant(text) to authenticated;
