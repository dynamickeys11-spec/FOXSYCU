update public.transactions
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seed_source','legacy-sql')
where coalesce(metadata->>'synthetic','false') = 'true'
  and metadata->>'seed_source' is null;

create or replace function public.replace_own_legacy_demo_seed(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = (select auth.uid())
  ) then
    raise exception 'account not found';
  end if;

  delete from public.transactions
  where account_id = p_account_id
    and user_id = (select auth.uid())
    and metadata->>'seed_source' = 'legacy-sql';
end;
$$;

revoke execute on function public.replace_own_legacy_demo_seed(uuid) from public, anon;
grant execute on function public.replace_own_legacy_demo_seed(uuid) to authenticated;
