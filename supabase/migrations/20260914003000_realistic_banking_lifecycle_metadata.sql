create index if not exists transactions_account_effective_date_idx on public.transactions(account_id, effective_date desc, created_at desc);
create index if not exists secure_messages_account_event_at_idx on public.secure_messages(account_id, event_at desc, created_at desc);

update public.transactions t
set metadata = jsonb_strip_nulls(
  coalesce(t.metadata,'{}'::jsonb)
  || jsonb_build_object(
    'payment_rail', case
      when t.transaction_type in ('CARD_PURCHASE','CARD_PAYMENT') then 'card'
      when t.transaction_type='ACH_CREDIT' then 'ach'
      when t.transaction_type='WIRE_OUT' then 'wire'
      when t.transaction_type='ZELLE_OUT' then 'zelle'
      when t.transaction_type='TRANSFER' then 'internal_transfer'
      else null end,
    'account_last4', a.account_number_last4,
    'transaction_detail_version', 2
  )
)
from public.accounts a
where t.account_id=a.id;

update public.secure_messages m
set metadata = jsonb_strip_nulls(coalesce(m.metadata,'{}'::jsonb) || jsonb_build_object('message_detail_version',2))
where m.transaction_reference is not null;
