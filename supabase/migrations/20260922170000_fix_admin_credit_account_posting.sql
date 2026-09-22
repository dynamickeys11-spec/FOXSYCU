-- FNCU: make admin account credits atomic across account, ledger, and transaction records.
-- The live function was corrected directly in Supabase before this migration was committed.
-- Re-applying the definition through migrations keeps the production database change reproducible.

create or replace function public.admin_credit_account(
  p_account_id uuid,
  p_amount numeric,
  p_company_name text default null,
  p_contract_reference text default null,
  p_purpose text default null,
  p_description text default null,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_account public.accounts;
  v_ledger public.ledger_accounts;
  v_new_balance numeric;
  v_tx_id uuid;
  v_ref text;
  v_description text;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'credit amount must be greater than zero';
  end if;

  select * into v_account
  from public.accounts
  where id = p_account_id and currency = 'USD'
  for update;

  if v_account.id is null then raise exception 'USD account not found'; end if;
  if v_account.status <> 'active' then raise exception 'account is not active'; end if;

  select * into v_ledger
  from public.ledger_accounts
  where id = v_account.ledger_account_id
  for update;

  if v_ledger.id is null then raise exception 'ledger account not found'; end if;

  v_new_balance := coalesce(v_account.posted_balance, 0) + p_amount;
  v_ref := coalesce(
    nullif(trim(p_reference), ''),
    'ADM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  );
  v_description := coalesce(nullif(trim(p_description), ''), 'Account credit');

  -- A settled admin credit changes both customer balances atomically.
  -- Reserved/pending funds are intentionally left untouched.
  update public.accounts
  set posted_balance = v_new_balance,
      available_balance = coalesce(available_balance, 0) + p_amount,
      updated_at = now()
  where id = v_account.id;

  -- Explicitly synchronize the ledger account in the same transaction.
  update public.ledger_accounts
  set balance = v_new_balance,
      updated_at = now()
  where id = v_ledger.id;

  insert into public.transactions(
    user_id, account_id, reference, transaction_type, direction, amount, fee,
    currency, status, counterparty, description, memo, initiated_at,
    effective_date, posted_at, available_balance_after, posted_balance_after, metadata
  ) values (
    v_account.user_id, v_account.id, v_ref, 'Deposit', 'credit', p_amount, 0,
    'USD', 'completed',
    coalesce(nullif(trim(p_company_name), ''), 'FNCU'),
    v_description, p_purpose, now(), current_date, now(),
    coalesce(v_account.available_balance, 0) + p_amount,
    v_new_balance,
    jsonb_build_object(
      'source','admin_credit',
      'admin_actor',auth.uid(),
      'company_name',nullif(trim(p_company_name),''),
      'contract_reference',nullif(trim(p_contract_reference),''),
      'purpose',nullif(trim(p_purpose),''),
      'auditable',true
    )
  ) returning id into v_tx_id;

  insert into public.audit_logs(user_id,action,resource_type,resource_id,metadata)
  values(
    auth.uid(),'admin_account_credit','account',v_account.id::text,
    jsonb_build_object(
      'customer_id',v_account.user_id,
      'transaction_id',v_tx_id,
      'amount',p_amount,
      'reference',v_ref,
      'company_name',p_company_name,
      'contract_reference',p_contract_reference,
      'purpose',p_purpose
    )
  );

  return jsonb_build_object(
    'account_id',v_account.id,
    'transaction_id',v_tx_id,
    'reference',v_ref,
    'new_available_balance',coalesce(v_account.available_balance,0) + p_amount,
    'new_posted_balance',v_new_balance
  );
end;
$function$;
