-- FNCU: controlled admin customer provisioning and safe zero-balance fallback.
-- The live database function is applied directly; this file keeps production schema changes reproducible.

create or replace function public.create_customer_account(
  p_account_type text default 'checking',
  p_currency text default 'USD'
)
returns public.accounts
language plpgsql
security definer
set search_path to ''
as $function$
declare
  result public.accounts;
  uid uuid := (select auth.uid());
  normalized_type text := lower(btrim(coalesce(p_account_type, 'checking')));
  normalized_currency text := upper(btrim(coalesce(p_currency, 'USD')));
begin
  if uid is null then raise exception 'authentication required'; end if;
  if normalized_type <> 'checking' then raise exception 'unsupported account type'; end if;
  if normalized_currency <> 'USD' then raise exception 'unsupported currency'; end if;

  select * into result from public.accounts
  where user_id = uid and account_type = normalized_type
  order by created_at limit 1;
  if result.id is not null then return result; end if;

  insert into public.accounts (
    user_id, account_type, account_name, currency, account_number_last4,
    status, available_balance, posted_balance, pending_balance
  ) values (
    uid, normalized_type, 'USD Savings Account', normalized_currency, null,
    'active', 0, 0, 0
  ) returning * into result;
  return result;
end;
$function$;

create or replace function public.admin_provision_customer(
  p_admin_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_country text default 'United States',
  p_account_name text default 'USD Savings Account',
  p_opening_balance numeric default 0,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account public.accounts;
  v_tx_id uuid;
  v_ref text;
  v_name text;
begin
  if p_admin_id is null or not exists (
    select 1 from public.admin_roles where user_id = p_admin_id and role = 'admin'
  ) then raise exception 'admin authorization required'; end if;
  if p_user_id is null then raise exception 'customer user id is required'; end if;
  if p_opening_balance is null or p_opening_balance < 0 then raise exception 'opening balance cannot be negative'; end if;
  v_name := coalesce(nullif(btrim(p_full_name), ''), split_part(coalesce(p_email,''), '@', 1), 'Customer');
  v_ref := coalesce(nullif(btrim(p_reference), ''), 'OPEN-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)));

  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'customer auth user not found'; end if;

  update public.profiles
     set full_name=v_name, preferred_name=coalesce(preferred_name,v_name),
         phone=coalesce(nullif(btrim(p_phone),''),phone),
         country=coalesce(nullif(btrim(p_country),''),'United States'),
         tier='Customer', currency='USD', customer_since=current_date,
         profile_completed=true, approval_status='approved',
         approval_reviewed_at=now(), approval_reviewed_by=p_admin_id,
         approval_note='Created directly by an authorized administrator'
   where id=p_user_id;

  insert into public.accounts(
    user_id,account_type,account_name,currency,account_number_last4,status,
    available_balance,posted_balance,pending_balance
  )
  select p_user_id,'checking',coalesce(nullif(btrim(p_account_name),''),'USD Savings Account'),
         'USD',null,'active',p_opening_balance,p_opening_balance,0
  where not exists(select 1 from public.accounts where user_id=p_user_id and account_type='checking')
  returning * into v_account;

  if v_account.id is null then
    select * into v_account from public.accounts
    where user_id=p_user_id and account_type='checking' order by created_at limit 1;
    if v_account.id is null then raise exception 'customer account could not be created'; end if;
  end if;

  if p_opening_balance > 0 then
    insert into public.transactions(
      user_id,account_id,reference,transaction_type,direction,amount,fee,currency,status,
      counterparty,description,memo,initiated_at,effective_date,posted_at,
      available_balance_after,posted_balance_after,metadata
    ) values (
      p_user_id,v_account.id,v_ref,'Account Opening','credit',p_opening_balance,0,'USD','completed',
      'FNCU','Opening balance','Initial account funding',now(),current_date,now(),
      p_opening_balance,p_opening_balance,
      jsonb_build_object('source','admin_customer_provisioning','admin_actor',p_admin_id,'opening_balance',true,'auditable',true)
    ) returning id into v_tx_id;
  end if;

  insert into public.security_preferences(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.notification_preferences(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.transfer_security_settings(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.card_controls(user_id,account_id,last4)
  values(p_user_id,v_account.id,coalesce(v_account.account_number_last4,'4821')) on conflict do nothing;

  insert into public.audit_logs(user_id,action,resource_type,resource_id,metadata)
  values(p_admin_id,'admin_customer_created','customer',p_user_id::text,
    jsonb_build_object('customer_id',p_user_id,'email',p_email,'account_id',v_account.id,'opening_balance',p_opening_balance,'reference',v_ref));

  return jsonb_build_object(
    'user_id',p_user_id,'account_id',v_account.id,'reference',v_ref,
    'opening_balance',p_opening_balance,'transaction_id',v_tx_id,
    'account_number_last4',v_account.account_number_last4
  );
end;
$function$;

revoke all on function public.admin_provision_customer(uuid,uuid,text,text,text,text,text,numeric,text) from public,anon,authenticated;
