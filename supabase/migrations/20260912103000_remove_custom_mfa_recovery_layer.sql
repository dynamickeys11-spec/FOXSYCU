drop function if exists public.has_mfa_recovery_grant(text);
drop function if exists public.consume_mfa_recovery_code(text);
drop function if exists public.issue_mfa_recovery_codes();
drop table if exists public.mfa_recovery_grants;
drop table if exists public.mfa_recovery_codes;
