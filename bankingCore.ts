import { supabase } from './supabaseClient'

export type LedgerPostingLine = {
  ledgerAccountId: string
  debit?: number
  credit?: number
  description?: string
  metadata?: Record<string, unknown>
}

export type PostTransactionInput = {
  idempotencyKey: string
  reference: string
  transactionType: string
  currency: string
  description?: string
  entries: LedgerPostingLine[]
  metadata?: Record<string, unknown>
}

export type PostTransactionResult = {
  journal_id: string
  status: 'posted' | 'already_posted'
  idempotent: boolean
  amount?: number
  currency?: string
}

/**
 * Banking Core transaction service.
 * All balance-changing operations should enter through this service once a
 * business workflow has been approved. The database RPC performs validation,
 * idempotency, row locking, double-entry posting, balance derivation and audit logging
 * atomically in one database transaction.
 */
export async function postTransaction(input: PostTransactionInput): Promise<PostTransactionResult> {
  const { data, error } = await supabase.rpc('post_double_entry', {
    p_idempotency_key: input.idempotencyKey,
    p_reference: input.reference,
    p_transaction_type: input.transactionType,
    p_currency: input.currency,
    p_description: input.description ?? null,
    p_entries: input.entries.map((entry) => ({
      ledger_account_id: entry.ledgerAccountId,
      debit: entry.debit ?? 0,
      credit: entry.credit ?? 0,
      description: entry.description ?? null,
      metadata: entry.metadata ?? {},
    })),
    p_metadata: input.metadata ?? {},
  })

  if (error) throw error
  if (!data || typeof data !== 'object') throw new Error('Banking Core returned an invalid posting response')
  return data as PostTransactionResult
}

export async function getLedgerBalance(ledgerAccountId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_ledger_balance', {
    p_ledger_account_id: ledgerAccountId,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function getOwnLedgerAccounts() {
  const { data, error } = await supabase
    .from('ledger_accounts')
    .select('id, account_id, code, name, account_type, currency, balance, status, created_at, updated_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getOwnJournalEntries(limit = 100) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, reference, idempotency_key, transaction_type, currency, description, status, metadata, posted_at, created_at, journal_lines(id, ledger_account_id, debit, credit, description, metadata)')
    .order('posted_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
