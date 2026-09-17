create or replace function private.sync_account_balance_from_ledger()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.account_id is not null then
    update public.accounts
       set posted_balance = new.balance,
           available_balance = greatest(0, new.balance - coalesce(reserved_balance, 0)),
           updated_at = now()
     where id = new.account_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_account_balance_from_ledger on public.ledger_accounts;
create trigger trg_sync_account_balance_from_ledger
after insert or update of balance on public.ledger_accounts
for each row execute function private.sync_account_balance_from_ledger();

create or replace function private.enforce_daily_transfer_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_used numeric := 0;
  v_limit constant numeric := 150000;
begin
  if new.rail = 'deposit' or new.user_id is null or new.amount is null or new.amount <= 0 then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  select coalesce(sum(m.amount), 0)
    into v_used
    from public.money_movement_requests m
   where m.user_id = new.user_id
     and m.rail <> 'deposit'
     and m.status in ('pending','processing','completed')
     and m.created_at >= current_date
     and m.created_at < current_date + interval '1 day';

  if v_used + new.amount > v_limit then
    raise exception 'daily transfer limit of $150,000 exceeded; remaining daily limit is $%', greatest(0, v_limit - v_used);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_daily_transfer_limit on public.money_movement_requests;
create trigger trg_enforce_daily_transfer_limit
before insert on public.money_movement_requests
for each row execute function private.enforce_daily_transfer_limit();

update public.accounts a
   set posted_balance = l.balance,
       available_balance = greatest(0, l.balance - coalesce(a.reserved_balance, 0)),
       updated_at = now()
  from public.ledger_accounts l
 where l.account_id = a.id
   and (abs(coalesce(a.posted_balance,0) - coalesce(l.balance,0)) > 0.01
        or abs(coalesce(a.available_balance,0) - greatest(0, l.balance - coalesce(a.reserved_balance,0))) > 0.01);
