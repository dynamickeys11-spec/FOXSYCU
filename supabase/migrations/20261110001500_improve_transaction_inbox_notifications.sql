-- Ensure every incoming credit produces a useful customer inbox notification.
-- The UI displays the linked transaction's effective_date as the notification date.
create or replace function public.create_transaction_inbox_message()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  should_notify boolean;
  display_type text;
  display_status text;
  signed_amount text;
  message_subject text;
  message_body text;
begin
  should_notify := lower(coalesce(new.direction, '')) = 'credit'
    or lower(coalesce(new.status, '')) <> 'completed'
    or abs(coalesce(new.amount, 0)) >= 25000;

  if not should_notify then
    return new;
  end if;

  display_type := initcap(replace(coalesce(new.transaction_type, 'Transaction'), '_', ' '));
  display_status := initcap(replace(coalesce(new.status, 'completed'), '_', ' '));
  signed_amount := case when lower(coalesce(new.direction, '')) = 'debit' then '-' else '+' end
    || '$' || to_char(abs(coalesce(new.amount, 0)), 'FM999,999,999,990.00');
  message_subject := 'Transaction update · ' || display_type || ' · ' || signed_amount;
  message_body := 'Your checking account recorded a ' || lower(display_type) || ' for ' || signed_amount || '. '
    || 'Status: ' || display_status || '. '
    || case when new.counterparty is not null then 'Counterparty: ' || new.counterparty || '. ' else '' end
    || case when new.effective_date is not null then 'Transaction date: ' || to_char(new.effective_date, 'Mon DD, YYYY') || '. ' else '' end
    || 'Reference: ' || coalesce(new.reference, '—') || '.';

  insert into public.secure_messages(user_id, subject, body, created_at, transaction_reference, event_at, account_id, metadata)
  values (
    new.user_id,
    message_subject,
    message_body,
    coalesce(new.created_at, now()),
    new.reference,
    coalesce(new.posted_at, new.initiated_at, new.created_at, now()),
    new.account_id,
    jsonb_build_object('transaction_type', new.transaction_type, 'direction', new.direction, 'effective_date', new.effective_date)
  )
  on conflict (user_id, transaction_reference) where transaction_reference is not null
  do update set
    subject = excluded.subject,
    body = excluded.body,
    event_at = excluded.event_at,
    account_id = excluded.account_id,
    metadata = excluded.metadata;

  return new;
end;
$function$;
