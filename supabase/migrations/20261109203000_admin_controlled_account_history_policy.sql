-- Administrator-controlled account history policy.
-- Historical activity is never fabricated. This policy only defines whether
-- verified/imported records may be displayed and the date window they cover.

create table if not exists public.account_history_policies (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  include_history boolean not null default false,
  history_period_months integer,
  history_start_date date,
  history_end_date date,
  history_source text not null default 'verified_import',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_history_period_valid
    check (history_period_months is null or history_period_months in (3,6,12,24,36,60)),
  constraint account_history_dates_valid
    check (
      (history_start_date is null and history_end_date is null)
      or (history_start_date is not null and history_end_date is not null and history_start_date <= history_end_date)
    ),
  constraint account_history_mode_valid
    check (
      (include_history = false and history_period_months is null and history_start_date is null and history_end_date is null)
      or
      (include_history = true and (
        (history_period_months is not null and history_period_months in (3,6,12,24,36,60) and history_start_date is not null and history_end_date is not null)
        or
        (history_period_months is null and history_start_date is not null and history_end_date is not null)
      ))
    )
);

alter table public.account_history_policies enable row level security;
revoke all on public.account_history_policies from public, anon, authenticated;
grant select on public.account_history_policies to authenticated;

drop policy if exists account_history_policies_admin_read on public.account_history_policies;
create policy account_history_policies_admin_read
  on public.account_history_policies
  for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles ar
      where ar.user_id = (select auth.uid()) and ar.role = 'admin'
    )
  );


drop policy if exists account_history_policies_customer_read on public.account_history_policies;
create policy account_history_policies_customer_read
  on public.account_history_policies
  for select to authenticated
  using (
    exists (
      select 1 from public.accounts a
      where a.id = account_history_policies.account_id
        and a.user_id = (select auth.uid())
    )
  );

create or replace function public.admin_set_account_history_policy(
  p_admin_id uuid,
  p_account_id uuid,
  p_include_history boolean,
  p_history_period_months integer default null,
  p_history_start_date date default null,
  p_history_end_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_account public.accounts;
  v_start date;
  v_end date;
begin
  if p_admin_id is null or not exists (
    select 1 from public.admin_roles where user_id = p_admin_id and role = 'admin'
  ) then
    raise exception 'admin authorization required';
  end if;

  select * into v_account
  from public.accounts
  where id = p_account_id
  for update;

  if not found then raise exception 'account not found'; end if;

  if coalesce(p_include_history, false) = false then
    v_start := null;
    v_end := null;
    p_history_period_months := null;
  else
    if p_history_period_months is not null
       and (p_history_period_months not in (3,6,12,24,36,60)
            or p_history_start_date is not null or p_history_end_date is not null) then
      raise exception 'choose a supported history period or a custom date range';
    end if;

    if p_history_period_months is null then
      if p_history_start_date is null or p_history_end_date is null
         or p_history_start_date > p_history_end_date
         or p_history_start_date < v_account.created_at::date
         or p_history_end_date > current_date then
        raise exception 'a valid custom history date range is required';
      end if;
      if p_history_end_date > v_account.created_at::date then
        raise exception 'history range cannot end after the account opening date';
      end if;
      v_start := p_history_start_date;
      v_end := p_history_end_date;
    else
      v_end := current_date;
      v_start := greatest(v_account.created_at::date, (current_date - make_interval(months => p_history_period_months))::date);
    end if;
  end if;

  insert into public.account_history_policies (
    account_id, include_history, history_period_months,
    history_start_date, history_end_date, history_source, created_by, updated_at
  )
  values (
    p_account_id, coalesce(p_include_history, false), p_history_period_months,
    v_start, v_end, 'verified_import', p_admin_id, now()
  )
  on conflict (account_id) do update set
    include_history = excluded.include_history,
    history_period_months = excluded.history_period_months,
    history_start_date = excluded.history_start_date,
    history_end_date = excluded.history_end_date,
    history_source = 'verified_import',
    created_by = excluded.created_by,
    updated_at = now();

  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (
    p_admin_id, 'admin_account_history_policy_updated', 'account', p_account_id::text,
    jsonb_build_object(
      'include_history', coalesce(p_include_history, false),
      'history_period_months', p_history_period_months,
      'history_start_date', v_start,
      'history_end_date', v_end,
      'history_source', 'verified_import'
    )
  );

  return jsonb_build_object(
    'account_id', p_account_id,
    'include_history', coalesce(p_include_history, false),
    'history_period_months', p_history_period_months,
    'history_start_date', v_start,
    'history_end_date', v_end,
    'history_source', 'verified_import'
  );
end;
$function$;

revoke all on function public.admin_set_account_history_policy(uuid,uuid,boolean,integer,date,date)
  from public, anon, authenticated;
grant execute on function public.admin_set_account_history_policy(uuid,uuid,boolean,integer,date,date)
  to service_role;

-- Transaction metadata must never rewrite the actual account-opening date.
drop trigger if exists trg_sync_canonical_account_open_date on public.transactions;

-- Remove automatic enrichment that inserted invented counterparties and payment
-- details into records marked as mock data. Imported history must retain its source.
drop trigger if exists transactions_mockdata_enrichment on public.transactions;

-- Every new account receives an explicit no-history policy unless an admin
-- subsequently enables verified history through the protected RPC.
create or replace function public.default_account_history_policy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.account_history_policies(account_id, include_history, history_source, created_by)
  values (new.id, false, 'verified_import', null)
  on conflict (account_id) do nothing;
  return new;
end;
$function$;

revoke all on function public.default_account_history_policy() from public, anon, authenticated;
drop trigger if exists trg_default_account_history_policy on public.accounts;
create trigger trg_default_account_history_policy
after insert on public.accounts
for each row execute function public.default_account_history_policy();
