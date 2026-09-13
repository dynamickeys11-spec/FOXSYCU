alter table public.secure_messages add column if not exists transaction_reference text;
create unique index if not exists secure_messages_user_transaction_reference_uidx
  on public.secure_messages(user_id, transaction_reference)
  where transaction_reference is not null;

create or replace function public.create_transaction_inbox_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_notify boolean;
  display_type text;
  display_status text;
  signed_amount text;
  message_subject text;
  message_body text;
begin
  should_notify := lower(coalesce(new.status, '')) <> 'completed' or abs(coalesce(new.amount, 0)) >= 25000;
  if not should_notify then return new; end if;
  display_type := initcap(replace(coalesce(new.transaction_type, 'Transaction'), '_', ' '));
  display_status := initcap(replace(coalesce(new.status, 'completed'), '_', ' '));
  signed_amount := case when new.direction = 'debit' then '-' else '+' end || '$' || to_char(abs(coalesce(new.amount, 0)), 'FM999,999,999,990.00');
  message_subject := 'Transaction update · ' || display_type || ' · ' || signed_amount;
  message_body := 'Your FOXSYCU checking account recorded a ' || lower(display_type) || ' for ' || signed_amount || '. '
    || 'Status: ' || display_status || '. '
    || case when new.counterparty is not null then 'Counterparty: ' || new.counterparty || '. ' else '' end
    || case when new.effective_date is not null then 'Effective date: ' || to_char(new.effective_date, 'Mon DD, YYYY') || '. ' else '' end
    || 'Reference: ' || coalesce(new.reference, '—') || '.';
  insert into public.secure_messages(user_id, subject, body, created_at, transaction_reference)
  values (new.user_id, message_subject, message_body, coalesce(new.created_at, now()), new.reference)
  on conflict (user_id, transaction_reference) where transaction_reference is not null
  do update set subject = excluded.subject, body = excluded.body;
  return new;
end;
$$;

drop trigger if exists transactions_inbox_message_trigger on public.transactions;
create trigger transactions_inbox_message_trigger
after insert on public.transactions
for each row execute function public.create_transaction_inbox_message();

insert into public.secure_messages(user_id, subject, body, created_at, transaction_reference)
select t.user_id,
       'Transaction update · ' || initcap(replace(coalesce(t.transaction_type, 'Transaction'), '_', ' ')) || ' · ' ||
         (case when t.direction = 'debit' then '-' else '+' end) || '$' || to_char(abs(t.amount), 'FM999,999,999,990.00'),
       'Your FOXSYCU checking account recorded a ' || lower(initcap(replace(coalesce(t.transaction_type, 'Transaction'), '_', ' '))) || ' for ' ||
         (case when t.direction = 'debit' then '-' else '+' end) || '$' || to_char(abs(t.amount), 'FM999,999,999,990.00') || '. '
         || 'Status: ' || initcap(replace(coalesce(t.status, 'completed'), '_', ' ')) || '. '
         || case when t.counterparty is not null then 'Counterparty: ' || t.counterparty || '. ' else '' end
         || case when t.effective_date is not null then 'Effective date: ' || to_char(t.effective_date, 'Mon DD, YYYY') || '. ' else '' end
         || 'Reference: ' || coalesce(t.reference, '—') || '.',
       coalesce(t.created_at, now()), t.reference
from (
  select t.*, row_number() over (partition by t.user_id order by t.effective_date desc nulls last, t.created_at desc, t.id) as rn
  from public.transactions t
) t
where lower(coalesce(t.status, '')) <> 'completed'
   or abs(coalesce(t.amount, 0)) >= 25000
   or t.rn % 6 = 0
on conflict (user_id, transaction_reference) where transaction_reference is not null
 do update set subject = excluded.subject, body = excluded.body;

revoke all on function public.create_transaction_inbox_message() from public, anon, authenticated;
alter function public.sync_canonical_account_open_date() set search_path = '';
alter function public.normalize_transaction_status(text) set search_path = '';
