-- Live migration: 20260914001558_build_realistic_banking_communications_v2
-- Adds structured secure-message metadata and enriches synthetic demo transactions
-- with realistic U.S. institutions, merchants, counterparties, and references.
-- The production migration was applied to Supabase project xuqjbuivekhbhlgoldfj.

alter table public.secure_messages
  add column if not exists message_type text not null default 'service',
  add column if not exists priority text not null default 'normal',
  add column if not exists account_id uuid,
  add column if not exists event_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists action_required boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists secure_messages_user_created_idx on public.secure_messages(user_id, created_at desc);
create index if not exists secure_messages_user_type_idx on public.secure_messages(user_id, message_type, created_at desc);

-- The remaining enrichment/backfill is intentionally deterministic and was applied
-- against the existing demo transaction universe during the live migration. New
-- canonical seed rows receive equivalent enrichment in CustomerProvider via
-- src/data/realisticBanking.ts.
