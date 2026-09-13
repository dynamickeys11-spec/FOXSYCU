create unique index if not exists accounts_account_number_unique
  on public.accounts(account_number)
  where account_number is not null and account_number <> '';

alter table public.accounts
  alter column account_number set not null;

create policy "accounts_self_insert"
on public.accounts
for insert
to authenticated
with check ((select auth.uid()) = user_id);
