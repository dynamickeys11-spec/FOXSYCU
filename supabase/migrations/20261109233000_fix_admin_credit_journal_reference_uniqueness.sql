-- Keep the customer-facing transaction reference while ensuring each admin credit
-- gets a unique internal journal reference (journal_entries.reference is globally unique).
do $migration$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.admin_credit_account_detailed(uuid,jsonb)'::regprocedure);

  if position('v_journal_reference text;' in v_def) = 0 then
    v_def := replace(
      v_def,
      '  v_idempotency_key text;' || chr(10),
      '  v_idempotency_key text;' || chr(10) || '  v_journal_reference text;' || chr(10)
    );
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

  if position('v_journal_reference text;' in v_def) = 0
     or position('v_journal_reference := v_ref' in v_def) = 0
     or position('v_journal_reference,' in v_def) = 0 then
    raise exception 'Could not safely apply admin credit journal-reference fix';
  end if;

  execute v_def;
end
$migration$;
