-- Allow authorized administrators to post to customer ledger accounts.
-- Customers remain restricted to their own ledger accounts; system settlement
-- accounts remain usable by the posting engine. This fixes admin credits failing
-- because the customer's ledger owner is not the administrator.

do $migration$
declare
  v_definition text;
  v_old text := 'and (la.user_id=v_user or la.account_type=''system'');';
  v_new text := 'and (la.user_id=v_user or la.account_type=''system'' or (exists (select 1 from public.admin_roles ar where ar.user_id=v_user and ar.role=''admin'') and la.account_id is not null and exists (select 1 from public.accounts a where a.id=la.account_id and a.user_id=la.user_id)));';
begin
  select pg_get_functiondef(
    'private.post_double_entry(text,text,text,text,text,jsonb,jsonb)'::regprocedure
  ) into v_definition;

  if position(v_old in v_definition) = 0 then
    if position(v_new in v_definition) > 0 then
      raise notice 'Admin ledger authorization is already installed';
      return;
    end if;
    raise exception 'Expected ledger authorization predicate not found; refusing to modify function';
  end if;

  v_definition := replace(v_definition, v_old, v_new);
  execute v_definition;
end;
$migration$;
