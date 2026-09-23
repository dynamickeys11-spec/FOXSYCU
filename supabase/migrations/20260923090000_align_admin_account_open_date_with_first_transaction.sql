create or replace function public.sync_canonical_account_open_date()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  first_date date;
  target_account uuid;
  target_user uuid;
  is_canonical boolean;
begin
  is_canonical := new.metadata->>'seed_source' = 'mockData-v1'
                  or new.metadata->>'source' = 'admin_customer_provisioning';

  if not is_canonical then
    return new;
  end if;

  target_account := new.account_id;
  target_user := new.user_id;

  select min(t.effective_date) into first_date
  from public.transactions t
  where t.user_id = target_user
    and t.account_id = target_account
    and (
      t.metadata->>'seed_source' = 'mockData-v1'
      or t.metadata->>'source' = 'admin_customer_provisioning'
    );

  if first_date is not null then
    update public.accounts
      set created_at = first_date::timestamptz,
          updated_at = greatest(updated_at, first_date::timestamptz)
      where id = target_account and user_id = target_user;

    update public.profiles
      set customer_since = first_date
      where id = target_user;
  end if;

  return new;
end;
$function$;
