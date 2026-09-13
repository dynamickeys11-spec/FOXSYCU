create or replace function public.replace_own_mockdata_seed(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.accounts a
    where a.id = p_account_id
      and a.user_id = auth.uid()
  ) then
    raise exception 'account not owned by current user';
  end if;

  delete from public.transactions
  where user_id = auth.uid()
    and account_id = p_account_id
    and metadata->>'seed_source' = 'mockData-v1';
end;
$$;

revoke all on function public.replace_own_mockdata_seed(uuid) from public;
revoke all on function public.replace_own_mockdata_seed(uuid) from anon;
grant execute on function public.replace_own_mockdata_seed(uuid) to authenticated;
