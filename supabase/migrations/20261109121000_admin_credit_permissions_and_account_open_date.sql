-- Allow the authenticated admin portal to call the protected credit RPC.
grant execute on function public.admin_credit_account_detailed(uuid,jsonb) to authenticated;
revoke execute on function public.admin_credit_account_detailed(uuid,jsonb) from public, anon;

-- Account opening date is explicitly supplied during administrator provisioning.
-- Existing accounts retain their historical dates.
create or replace function public.admin_provision_customer_clean(
  p_admin_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_country text default 'United States',
  p_account_name text default 'USD Savings Account',
  p_account_type text default 'checking',
  p_credit_details jsonb default '{}'::jsonb,
  p_account_created_date date default current_date
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
  v_amount numeric := round(coalesce((p_credit_details->>'amount')::numeric, 0), 2);
  v_credit_date date := coalesce(nullif(p_credit_details->>'credit_date','')::date, p_account_created_date, current_date);
  v_credit_time text := nullif(trim(p_credit_details->>'credit_time'), '');
  v_initiated_at timestamptz;
  v_posted_at timestamptz;
  v_transaction_type text := coalesce(nullif(trim(p_credit_details->>'transaction_type'), ''), 'Deposit');
  v_description text := nullif(trim(p_credit_details->>'description'), '');
  v_memo text := nullif(trim(p_credit_details->>'memo'), '');
  v_sender_name text := nullif(trim(p_credit_details->>'sender_name'), '');
  v_sender_bank text := nullif(trim(p_credit_details->>'sender_bank'), '');
  v_sender_account text := nullif(trim(p_credit_details->>'sender_account'), '');
  v_routing_number text := nullif(trim(p_credit_details->>'routing_number'), '');
  v_effective_date date := coalesce(nullif(p_credit_details->>'effective_date','')::date, v_credit_date);
  v_reference text := nullif(trim(p_credit_details->>'reference'), '');
  v_internal_note text := nullif(trim(p_credit_details->>'internal_note'), '');
  v_ledger_id uuid;
  v_system_ledger_id uuid;
  v_post_result jsonb;
  v_account_number text;
begin
  if p_admin_id is null or not exists (select 1 from public.admin_roles where user_id=p_admin_id and role='admin') then
    raise exception 'admin authorization required';
  end if;
  if p_user_id is null or not exists (select 1 from auth.users where id=p_user_id) then
    raise exception 'customer auth user not found';
  end if;
  if p_account_created_date is null then
    raise exception 'account creation date is required';
  end if;
  if v_amount < 0 then raise exception 'credit amount cannot be negative'; end if;
  if jsonb_typeof(coalesce(p_credit_details,'{}'::jsonb)) <> 'object' then raise exception 'credit details must be an object'; end if;

  v_name := coalesce(nullif(btrim(p_full_name),''),split_part(coalesce(p_email,''),'@',1),'Customer');
  v_ref := coalesce(v_reference,'ADM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)));

  if v_credit_time is not null and v_credit_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    raise exception 'credit time must use HH:MM or HH:MM:SS';
  end if;

  if v_credit_time is null then v_initiated_at := v_credit_date::timestamptz;
  else v_initiated_at := (v_credit_date::text||' '||v_credit_time)::timestamp at time zone 'UTC';
  end if;

  v_posted_at := coalesce(nullif(p_credit_details->>'posting_date','')::date::timestamptz,v_initiated_at);

  update public.profiles set
    full_name=v_name,
    preferred_name=coalesce(preferred_name,v_name),
    phone=coalesce(nullif(btrim(p_phone),''),phone),
    country=coalesce(nullif(btrim(p_country),''),'United States'),
    tier='Customer', currency='USD',
    customer_since=coalesce(customer_since,p_account_created_date),
    profile_completed=true, approval_status='approved',
    approval_reviewed_at=now(), approval_reviewed_by=p_admin_id,
    approval_note='Created directly by an authorized administrator'
  where id=p_user_id;

  if exists(select 1 from public.accounts where user_id=p_user_id) then
    raise exception 'customer already has an account; use the account credit workflow instead';
  end if;

  for i in 1..20 loop
    v_account_number := lpad((floor(random()*100000000000))::bigint::text,12,'0');
    exit when not exists(select 1 from public.accounts where account_number=v_account_number);
  end loop;
  if v_account_number is null or exists(select 1 from public.accounts where account_number=v_account_number) then
    raise exception 'could not generate a unique account number';
  end if;

  insert into public.accounts(
    user_id,account_type,account_name,currency,account_number,account_number_last4,status,
    available_balance,posted_balance,pending_balance,created_at,updated_at
  ) values(
    p_user_id,
    case when lower(coalesce(p_account_type,'checking')) in ('checking','savings') then lower(p_account_type) else 'checking' end,
    coalesce(nullif(btrim(p_account_name),''),'USD Savings Account'),'USD',v_account_number,right(v_account_number,4),
    'active',0,0,0,p_account_created_date::timestamptz,now()
  ) returning * into v_account;

  select * into v_account from public.accounts where id=v_account.id;
  v_ledger_id := v_account.ledger_account_id;
  if v_ledger_id is null then raise exception 'customer ledger account was not created'; end if;

  if v_amount > 0 then
    v_system_ledger_id := private.ensure_system_ledger_account('USD');
    v_post_result := public.post_double_entry(
      'admin-initial-credit-'||v_account.id::text,v_ref,v_transaction_type,'USD',
      coalesce(v_description,'Account credit'),
      jsonb_build_array(
        jsonb_build_object('ledger_account_id',v_ledger_id,'debit',v_amount,'credit',0,'description',coalesce(v_description,'Account credit'),'metadata',jsonb_build_object('source','admin_account_provisioning')),
        jsonb_build_object('ledger_account_id',v_system_ledger_id,'debit',0,'credit',v_amount,'description',coalesce(v_description,'Account credit')||' offset','metadata',jsonb_build_object('source','admin_account_provisioning'))
      ),
      jsonb_build_object('actor_user_id',p_admin_id,'source','admin_account_provisioning')
    );

    insert into public.transactions(
      user_id,account_id,reference,transaction_type,direction,amount,fee,currency,status,counterparty,description,memo,
      initiated_at,effective_date,posted_at,available_balance_after,posted_balance_after,metadata
    ) values(
      p_user_id,v_account.id,v_ref,v_transaction_type,'credit',v_amount,0,'USD','completed',v_sender_name,
      coalesce(v_description,'Account credit'),v_memo,v_initiated_at,v_effective_date,v_posted_at,v_amount,v_amount,
      jsonb_strip_nulls(jsonb_build_object(
        'source','admin_account_provisioning','admin_actor',p_admin_id,'account_created_date',p_account_created_date,
        'credit_date',v_credit_date,'credit_time',v_credit_time,'transaction_type',v_transaction_type,'reference',v_ref,
        'sender_name',v_sender_name,'sender_account_last4',case when v_sender_account is null then null else right(regexp_replace(v_sender_account,'[^0-9A-Za-z]','','g'),4) end,
        'sender_bank',v_sender_bank,'routing_number_last4',case when v_routing_number is null then null else right(regexp_replace(v_routing_number,'[^0-9A-Za-z]','','g'),4) end,
        'effective_date',v_effective_date,'posting_date',coalesce(nullif(p_credit_details->>'posting_date','')::date,v_credit_date),
        'description',v_description,'memo',v_memo
      ))
    ) returning id into v_tx_id;
  end if;

  insert into public.security_preferences(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.notification_preferences(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.transfer_security_settings(user_id) values(p_user_id) on conflict(user_id) do nothing;
  insert into public.card_controls(user_id,account_id,last4) values(p_user_id,v_account.id,v_account.account_number_last4) on conflict do nothing;

  insert into public.audit_logs(user_id,action,resource_type,resource_id,metadata)
  values(p_admin_id,'admin_customer_created','customer',p_user_id::text,jsonb_strip_nulls(jsonb_build_object(
    'customer_id',p_user_id,'email',p_email,'account_id',v_account.id,'account_number_last4',v_account.account_number_last4,
    'account_created_date',p_account_created_date,'initial_credit_transaction_id',v_tx_id,
    'initial_credit_amount',case when v_amount=0 then null else v_amount end,
    'reference',case when v_amount=0 then null else v_ref end,'internal_note',v_internal_note,'history_inherited',false
  )));

  return jsonb_build_object(
    'user_id',p_user_id,'account_id',v_account.id,'account_number_last4',v_account.account_number_last4,
    'initial_credit_transaction_id',v_tx_id,'reference',case when v_amount=0 then null else v_ref end,
    'opening_balance',v_amount,'final_balance',v_amount,'history_count',case when v_tx_id is null then 0 else 1 end,
    'history_inherited',false,'account_created_date',p_account_created_date
  );
end;
$function$;
