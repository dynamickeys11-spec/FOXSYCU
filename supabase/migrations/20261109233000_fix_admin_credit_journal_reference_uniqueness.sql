-- Give each admin credit a unique journal reference and, when needed,
-- a unique transaction reference while retaining the operator-entered reference
-- in journal metadata and transaction metadata.
do $migration$
declare
  v_def text;
  v_journal_line text;
begin
  v_def := pg_get_functiondef('public.admin_credit_account_detailed(uuid,jsonb)'::regprocedure);

  if position('v_journal_reference text;' in v_def) = 0 then
    v_def := replace(
      v_def,
      '  v_idempotency_key text;' || chr(10),
      '  v_idempotency_key text;' || chr(10) ||
      '  v_journal_reference text;' || chr(10) ||
      '  v_tx_reference text;' || chr(10)
    );
  elsif position('v_tx_reference text;' in v_def) = 0 then
    v_def := replace(v_def, '  v_journal_reference text;' || chr(10),
      '  v_journal_reference text;' || chr(10) || '  v_tx_reference text;' || chr(10));
  end if;

  if position('v_journal_reference := v_ref' in v_def) = 0 then
    v_def := replace(
      v_def,
      '  v_post_result := public.post_double_entry(' || chr(10) ||
      '    v_idempotency_key,' || chr(10) ||
      '    v_ref,',
      '  v_journal_reference := v_ref || ' || quote_literal('-') ||
      ' || upper(substr(encode(extensions.digest(convert_to(v_idempotency_key, ' ||
      quote_literal('utf8') || '), ' || quote_literal('sha256') || '), ' ||
      quote_literal('hex') || '), 1, 12));' || chr(10) || chr(10) ||
      '  v_post_result := public.post_double_entry(' || chr(10) ||
      '    v_idempotency_key,' || chr(10) ||
      '    v_journal_reference,'
    );
  end if;

  v_journal_line := '  v_journal_reference := v_ref || ' || quote_literal('-') ||
    ' || upper(substr(encode(extensions.digest(convert_to(v_idempotency_key, ' ||
    quote_literal('utf8') || '), ' || quote_literal('sha256') || '), ' ||
    quote_literal('hex') || '), 1, 12));';

  if position('v_tx_reference := case when exists' in v_def) = 0 then
    v_def := replace(v_def, v_journal_line,
      v_journal_line || chr(10) ||
      '  v_tx_reference := case when exists (select 1 from public.transactions where reference = v_ref) then v_journal_reference else v_ref end;');
  end if;

  v_def := replace(v_def,
    '    select id into v_tx_id from public.transactions',
    '    select id, reference into v_tx_id, v_tx_reference from public.transactions');
  v_def := replace(v_def,
    'v_account.id, v_ref, v_transaction_type,',
    'v_account.id, v_tx_reference, v_transaction_type,');
  v_def := replace(v_def,
    'v_post_result->>''journal_id'', ''reference'', v_ref,',
    'v_post_result->>''journal_id'', ''reference'', v_tx_reference,');

  if position('v_journal_reference text;' in v_def) = 0
     or position('v_journal_reference := v_ref' in v_def) = 0
     or position('v_journal_reference,' in v_def) = 0
     or position('v_tx_reference text;' in v_def) = 0
     or position('v_tx_reference := case when exists' in v_def) = 0
     or position('v_account.id, v_tx_reference, v_transaction_type' in v_def) = 0
     or position('select id, reference into v_tx_id, v_tx_reference' in v_def) = 0 then
    raise exception 'Could not safely apply admin credit reference uniqueness fix';
  end if;

  execute v_def;
end
$migration$;
