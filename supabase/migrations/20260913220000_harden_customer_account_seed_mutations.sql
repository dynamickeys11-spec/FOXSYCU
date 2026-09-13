create or replace function public.rename_own_account(p_account_id uuid, p_account_name text)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.accounts;
  normalized_name text := btrim(p_account_name);
begin
  if normalized_name is null or normalized_name = '' or length(normalized_name) > 120 then
    raise exception 'invalid account name';
  end if;

  update public.accounts
  set account_name = normalized_name,
      updated_at = now()
  where id = p_account_id
    and user_id = (select auth.uid())
  returning * into result;

  if result.id is null then
    raise exception 'account not found';
  end if;

  return result;
end;
$$;

create or replace function public.restore_canonical_account(p_account_id uuid)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.accounts;
begin
  update public.accounts
  set available_balance = 5000000.00,
      posted_balance = 5000000.00,
      pending_balance = 0.00,
      updated_at = now()
  where id = p_account_id
    and user_id = (select auth.uid())
    and account_type = 'checking'
  returning * into result;

  if result.id is null then
    raise exception 'checking account not found';
  end if;

  return result;
end;
$$;

revoke execute on function public.rename_own_account(uuid, text) from public, anon;
revoke execute on function public.restore_canonical_account(uuid) from public, anon;
grant execute on function public.rename_own_account(uuid, text) to authenticated;
grant execute on function public.restore_canonical_account(uuid) to authenticated;
