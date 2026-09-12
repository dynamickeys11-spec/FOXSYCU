-- Internal security tables are intentionally not directly readable or writable by customers.
drop policy if exists idempotency_keys_deny_direct on public.idempotency_keys;
create policy idempotency_keys_deny_direct on public.idempotency_keys for all to authenticated using (false) with check (false);
drop policy if exists mfa_recovery_codes_deny_direct on public.mfa_recovery_codes;
create policy mfa_recovery_codes_deny_direct on public.mfa_recovery_codes for all to authenticated using (false) with check (false);
