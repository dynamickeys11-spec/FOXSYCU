-- FOXSYCU Build 1: Banking Core
-- Ledger accounts, immutable journal, double-entry lines, atomic posting,
-- idempotency and audit integration.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','income','expense','system')),
  currency text not null default 'USD',
  balance numeric(24,8) not null default 0,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, code),
  unique (account_id),
  check ((account_type = 'system' and user_id is null) or (account_type <> 'system' and user_id is not null))
);

create index if not exists ledger_accounts_user_idx on public.ledger_accounts(user_id);
create index if not exists ledger_accounts_account_idx on public.ledger_accounts(account_id);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null,
  idempotency_key text not null,
  transaction_type text not null,
  currency text not null,
  description text,
  status text not null default 'posted' check (status in ('posted','reversed')),
  metadata jsonb not null default '{}'::jsonb,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  unique (reference)
);
create index if not exists journal_entries_user_posted_idx on public.journal_entries(user_id, posted_at desc);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journal_entries(id) on delete restrict,
  ledger_account_id uuid not null references public.ledger_accounts(id) on delete restrict,
  debit numeric(24,8) not null default 0,
  credit numeric(24,8) not null default 0,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (debit >= 0 and credit >= 0),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);
create index if not exists journal_lines_journal_idx on public.journal_lines(journal_id);
create index if not exists journal_lines_account_idx on public.journal_lines(ledger_account_id);

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  request_hash text not null,
  journal_id uuid references public.journal_entries(id) on delete set null,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists idempotency_user_idx on public.idempotency_keys(user_id, created_at desc);

alter table public.accounts add column if not exists ledger_account_id uuid unique;

alter table public.ledger_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.idempotency_keys enable row level security;

revoke all on public.ledger_accounts from anon, authenticated;
revoke all on public.journal_entries from anon, authenticated;
revoke all on public.journal_lines from anon, authenticated;
revoke all on public.idempotency_keys from anon, authenticated;
grant select on public.ledger_accounts to authenticated;
grant select on public.journal_entries to authenticated;
grant select on public.journal_lines to authenticated;

create policy "ledger accounts own rows" on public.ledger_accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy "journal entries own rows" on public.journal_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "journal lines through own journal" on public.journal_lines for select to authenticated using (exists (select 1 from public.journal_entries j where j.id = journal_id and j.user_id = (select auth.uid())));

-- The privileged implementation lives in the private schema. It is callable only
-- through the authenticated public RPC and pins search_path to avoid hijacking.
create or replace function private.ensure_system_ledger_account(p_currency text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.ledger_accounts where account_type='system' and currency=upper(p_currency) limit 1 for update;
  if v_id is null then
    insert into public.ledger_accounts(user_id, account_id, code, name, account_type, currency)
    values (null, null, 'SYS-' || upper(p_currency), 'FOXSYCU System Settlement', 'system', upper(p_currency)) returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function private.ensure_system_ledger_account(text) from public, anon, authenticated;

create or replace function private.bootstrap_account_ledger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ledger_id uuid; v_system_id uuid; v_journal_id uuid; v_amount numeric;
begin
  select id into v_ledger_id from public.ledger_accounts where account_id=new.id;
  if v_ledger_id is not null then return new; end if;
  insert into public.ledger_accounts(user_id, account_id, code, name, account_type, currency, balance)
  values (new.user_id,new.id,'ACCT-' || replace(new.id::text,'-',''),new.account_name,'asset',new.currency,0) returning id into v_ledger_id;
  update public.accounts set ledger_account_id=v_ledger_id where id=new.id;
  v_amount:=coalesce(new.posted_balance,0);
  if v_amount<>0 then
    v_system_id:=private.ensure_system_ledger_account(new.currency);
    insert into public.journal_entries(user_id,reference,idempotency_key,transaction_type,currency,description,metadata)
    values(new.user_id,'OPEN-'||new.id::text,'opening-'||new.id::text,'ACCOUNT_OPENING',new.currency,'Opening balance',jsonb_build_object('system_generated',true)) returning id into v_journal_id;
    insert into public.journal_lines(journal_id,ledger_account_id,debit,credit,description) values(v_journal_id,v_ledger_id,greatest(v_amount,0),greatest(-v_amount,0),'Opening balance');
    insert into public.journal_lines(journal_id,ledger_account_id,debit,credit,description) values(v_journal_id,v_system_id,greatest(-v_amount,0),greatest(v_amount,0),'Opening balance offset');
    update public.ledger_accounts set balance=v_amount,updated_at=now() where id=v_ledger_id;
    update public.ledger_accounts set balance=balance-v_amount,updated_at=now() where id=v_system_id;
  end if;
  return new;
end;
$$;
revoke all on function private.bootstrap_account_ledger() from public, anon, authenticated;
drop trigger if exists bootstrap_account_ledger on public.accounts;
create trigger bootstrap_account_ledger after insert on public.accounts for each row execute function private.bootstrap_account_ledger();

-- Backfill any account rows that predate Banking Core.
do $$
declare r record; v_ledger_id uuid; v_system_id uuid; v_journal_id uuid; v_amount numeric;
begin
  for r in select * from public.accounts where ledger_account_id is null loop
    insert into public.ledger_accounts(user_id,account_id,code,name,account_type,currency,balance)
    values(r.user_id,r.id,'ACCT-'||replace(r.id::text,'-',''),r.account_name,'asset',r.currency,0) returning id into v_ledger_id;
    update public.accounts set ledger_account_id=v_ledger_id where id=r.id;
    v_amount:=coalesce(r.posted_balance,0);
    if v_amount<>0 then
      v_system_id:=private.ensure_system_ledger_account(r.currency);
      insert into public.journal_entries(user_id,reference,idempotency_key,transaction_type,currency,description,metadata)
      values(r.user_id,'OPEN-'||r.id::text,'opening-'||r.id::text,'ACCOUNT_OPENING',r.currency,'Opening balance',jsonb_build_object('system_generated',true)) on conflict (user_id,idempotency_key) do nothing returning id into v_journal_id;
      if v_journal_id is not null then
        insert into public.journal_lines(journal_id,ledger_account_id,debit,credit,description) values(v_journal_id,v_ledger_id,greatest(v_amount,0),greatest(-v_amount,0),'Opening balance');
        insert into public.journal_lines(journal_id,ledger_account_id,debit,credit,description) values(v_journal_id,v_system_id,greatest(-v_amount,0),greatest(v_amount,0),'Opening balance offset');
        update public.ledger_accounts set balance=v_amount,updated_at=now() where id=v_ledger_id;
        update public.ledger_accounts set balance=balance-v_amount,updated_at=now() where id=v_system_id;
      end if;
    end if;
  end loop;
end $$;

create or replace function private.post_double_entry(p_idempotency_key text,p_reference text,p_transaction_type text,p_currency text,p_description text,p_entries jsonb,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_hash text; v_existing public.idempotency_keys%rowtype; v_journal_id uuid;
  v_total_debit numeric:=0; v_total_credit numeric:=0; v_count integer:=0; v_valid integer:=0; v_account_count integer:=0; v_currency_count integer:=0; r record; v_balance numeric;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency key required' using errcode='22023'; end if;
  if nullif(trim(p_reference),'') is null then raise exception 'reference required' using errcode='22023'; end if;
  if p_entries is null or jsonb_typeof(p_entries)<>'array' then raise exception 'entries must be a JSON array' using errcode='22023'; end if;
  v_hash:=encode(extensions.digest(convert_to(coalesce(p_reference,'')||'|'||coalesce(p_transaction_type,'')||'|'||upper(coalesce(p_currency,''))||'|'||coalesce(p_description,'')||'|'||p_entries::text||'|'||coalesce(p_metadata,'{}'::jsonb)::text,'utf8'),'sha256'),'hex');
  insert into public.idempotency_keys(user_id,key,request_hash,status) values(v_user,p_idempotency_key,v_hash,'processing') on conflict (user_id,key) do nothing;
  select * into v_existing from public.idempotency_keys where user_id=v_user and key=p_idempotency_key for update;
  if v_existing.request_hash<>v_hash then raise exception 'idempotency key reused with different request' using errcode='22023'; end if;
  if v_existing.journal_id is not null then return jsonb_build_object('journal_id',v_existing.journal_id,'status','already_posted','idempotent',true); end if;
  select count(*),coalesce(sum(greatest(coalesce((e->>'debit')::numeric,0),0)),0),coalesce(sum(greatest(coalesce((e->>'credit')::numeric,0),0)),0) into v_count,v_total_debit,v_total_credit from jsonb_array_elements(p_entries) e;
  if v_count<2 then raise exception 'double-entry journal requires at least two lines' using errcode='22023'; end if;
  if v_total_debit<=0 or v_total_debit<>v_total_credit then raise exception 'journal is not balanced' using errcode='22023'; end if;
  select count(*) into v_valid from jsonb_array_elements(p_entries) e where coalesce((e->>'debit')::numeric,0)>=0 and coalesce((e->>'credit')::numeric,0)>=0 and ((coalesce((e->>'debit')::numeric,0)>0 and coalesce((e->>'credit')::numeric,0)=0) or (coalesce((e->>'credit')::numeric,0)>0 and coalesce((e->>'debit')::numeric,0)=0));
  if v_valid<>v_count then raise exception 'each journal line must contain either a debit or a credit' using errcode='22023'; end if;
  select count(*) into v_account_count from (select distinct (e->>'ledger_account_id')::uuid id from jsonb_array_elements(p_entries) e) x;
  if v_account_count<>v_count then raise exception 'duplicate ledger account lines are not allowed' using errcode='22023'; end if;
  select count(*) into v_currency_count from public.ledger_accounts la where la.id in (select (e->>'ledger_account_id')::uuid from jsonb_array_elements(p_entries) e) and la.currency=upper(p_currency) and (la.user_id=v_user or la.account_type='system');
  if v_currency_count<>v_account_count then raise exception 'one or more ledger accounts are invalid or unauthorized' using errcode='42501'; end if;
  for r in select la.id from public.ledger_accounts la where la.id in (select (e->>'ledger_account_id')::uuid from jsonb_array_elements(p_entries) e) order by la.id for update loop null; end loop;
  insert into public.journal_entries(user_id,reference,idempotency_key,transaction_type,currency,description,metadata) values(v_user,p_reference,p_idempotency_key,p_transaction_type,upper(p_currency),p_description,p_metadata) returning id into v_journal_id;
  for r in select * from jsonb_to_recordset(p_entries) as x(ledger_account_id uuid,debit numeric,credit numeric,description text,metadata jsonb) loop
    insert into public.journal_lines(journal_id,ledger_account_id,debit,credit,description,metadata) values(v_journal_id,r.ledger_account_id,coalesce(r.debit,0),coalesce(r.credit,0),r.description,coalesce(r.metadata,'{}'::jsonb));
    update public.ledger_accounts set balance=balance+coalesce(r.debit,0)-coalesce(r.credit,0),updated_at=now() where id=r.ledger_account_id;
  end loop;
  for r in select distinct la.account_id from public.ledger_accounts la where la.id in (select (e->>'ledger_account_id')::uuid from jsonb_array_elements(p_entries) e) and la.account_id is not null loop
    select balance into v_balance from public.ledger_accounts where account_id=r.account_id;
    update public.accounts set posted_balance=v_balance,available_balance=v_balance,updated_at=now() where id=r.account_id;
  end loop;
  update public.idempotency_keys set journal_id=v_journal_id,status='completed',updated_at=now() where id=v_existing.id;
  insert into public.audit_logs(user_id,action,resource_type,resource_id,metadata) values(v_user,'transaction_posted','journal_entry',v_journal_id::text,jsonb_build_object('reference',p_reference,'transaction_type',p_transaction_type,'currency',upper(p_currency),'amount',v_total_debit,'idempotency_key',p_idempotency_key));
  return jsonb_build_object('journal_id',v_journal_id,'status','posted','idempotent',false,'amount',v_total_debit,'currency',upper(p_currency));
exception when others then
  update public.idempotency_keys set status='failed',updated_at=now() where user_id=v_user and key=p_idempotency_key and journal_id is null;
  raise;
end;
$$;
revoke all on function private.post_double_entry(text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant usage on schema private to authenticated;

create or replace function public.post_double_entry(p_idempotency_key text,p_reference text,p_transaction_type text,p_currency text,p_description text,p_entries jsonb,p_metadata jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.post_double_entry($1,$2,$3,$4,$5,$6,$7); $$;
revoke all on function public.post_double_entry(text,text,text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.post_double_entry(text,text,text,text,text,jsonb,jsonb) to authenticated;

create or replace function public.get_ledger_balance(p_ledger_account_id uuid)
returns numeric language sql security invoker set search_path = '' as $$ select balance from public.ledger_accounts where id=$1 and user_id=(select auth.uid()); $$;
revoke all on function public.get_ledger_balance(uuid) from public,anon;
grant execute on function public.get_ledger_balance(uuid) to authenticated;

update public.foxsycu_runtime_state set schema_version=3, updated_at=now() where id='foxsycu-demo';
