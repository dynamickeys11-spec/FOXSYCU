revoke all on function public.create_transaction_inbox_message() from public, anon, authenticated;
alter function public.sync_canonical_account_open_date() set search_path = '';
alter function public.normalize_transaction_status(text) set search_path = '';
