-- Give each distinct admin credit operation its own idempotency key.
-- The browser retains the same key for an exact retry, and rotates it when
-- the submitted credit details change or a prior credit succeeds.

do $migration$
declare
  v_def text;
  v_old text;
begin
  select pg_get_functiondef('public.admin_credit_account_detailed(uuid,jsonb)'::regprocedure)
    into v_def;

  v_old := '  v_post_result jsonb;';
  if position(v_old in v_def) = 0 then raise exception 'Expected credit function declaration was not found'; end if;
  v_def := replace(v_def, v_old, v_old || E'\n  v_idempotency_key text;');

  v_old := '  v_system_ledger_id := private.ensure_system_ledger_account(''USD'');';
  if position(v_old in v_def) = 0 then raise exception 'Expected system ledger initialization was not found'; end if;
  v_def := replace(v_def, v_old,
    v_old || E'\n\n  v_idempotency_key := coalesce(\n    nullif(trim(p_credit_details->>''idempotency_key''), ''''),\n    ''admin-account-credit-'' || v_account.id::text || ''-'' || v_ref\n  );');

  v_old := E'v_post_result := public.post_double_entry(\\n    ' || '''admin-account-credit-'' || v_account.id::text || ''-'' || v_ref';
  if position(v_old in v_def) = 0 then raise exception 'Expected legacy idempotency key call argument was not found'; end if;
  v_def := replace(v_def, v_old, E'v_post_result := public.post_double_entry(\\n    v_idempotency_key');

  v_old := '  select posted_balance, available_balance';
  if position(v_old in v_def) = 0 then raise exception 'Expected balance read was not found'; end if;
  v_def := replace(v_def, v_old,
    E'  if coalesce(v_post_result->>''status'', '''') = ''already_posted'' then\n' ||
    E'    select id into v_tx_id from public.transactions\n' ||
    E'    where account_id = v_account.id and metadata->>''journal_id'' = v_post_result->>''journal_id''\n' ||
    E'    order by created_at desc limit 1;\n' ||
    E'    select posted_balance, available_balance into v_new_balance, v_new_available\n' ||
    E'    from public.accounts where id = v_account.id;\n' ||
    E'    return jsonb_build_object(\n' ||
    E'      ''account_id'', v_account.id, ''transaction_id'', v_tx_id,\n' ||
    E'      ''journal_id'', v_post_result->>''journal_id'', ''reference'', v_ref,\n' ||
    E'      ''new_available_balance'', v_new_available, ''new_posted_balance'', v_new_balance,\n' ||
    E'      ''idempotent'', true\n' ||
    E'    );\n' ||
    E'  end if;\n\n' || v_old);

  execute v_def;
end;
$migration$;
