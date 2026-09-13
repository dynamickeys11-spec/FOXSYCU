-- FOXSYCU: account-number invariant cleanup
-- Keep one canonical unique index, backfill legacy rows, and make the
-- synthetic 12-digit account number a database invariant.

drop index if exists public.accounts_account_number_unique;

update public.accounts
set account_number = lpad((('x' || substr(md5(id::text),1,12))::bit(48)::bigint % 1000000000000)::text,12,'0')
where account_number is null or account_number = '';

update public.accounts
set account_number_last4 = right(account_number,4)
where account_number is not null
  and (account_number_last4 is null or account_number_last4 <> right(account_number,4));

alter table public.accounts alter column account_number set not null;
alter table public.accounts drop constraint if exists accounts_account_number_format;
alter table public.accounts add constraint accounts_account_number_format check (account_number ~ '^[0-9]{12}$');
