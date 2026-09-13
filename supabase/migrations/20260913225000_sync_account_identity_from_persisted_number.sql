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
      account_number_last4 = right(account_number, 4),
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

revoke execute on function public.rename_own_account(uuid,text) from public, anon;
grant execute on function public.rename_own_account(uuid,text) to authenticated;

update public.accounts
set account_number_last4 = right(account_number, 4), updated_at = now()
where account_number is not null
  and account_number_last4 is distinct from right(account_number, 4);
