create or replace function public.create_customer_account(p_account_type text default 'checking', p_currency text default 'USD')
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.accounts;
  uid uuid := (select auth.uid());
  normalized_type text := lower(btrim(coalesce(p_account_type, 'checking')));
  normalized_currency text := upper(btrim(coalesce(p_currency, 'USD')));
begin
  if uid is null then raise exception 'authentication required'; end if;
  if normalized_type <> 'checking' then raise exception 'unsupported account type'; end if;
  if normalized_currency <> 'USD' then raise exception 'unsupported currency'; end if;

  select * into result
  from public.accounts
  where user_id = uid and account_type = normalized_type
  order by created_at
  limit 1;
  if result.id is not null then return result; end if;

  insert into public.accounts (
    user_id, account_type, account_name, currency, account_number_last4,
    status, available_balance, posted_balance, pending_balance
  ) values (
    uid, normalized_type, 'Checking Account', normalized_currency, null,
    'active', 5000000, 5000000, 0
  ) returning * into result;

  return result;
end;
$$;

revoke execute on function public.create_customer_account(text,text) from public, anon;
grant execute on function public.create_customer_account(text,text) to authenticated;
