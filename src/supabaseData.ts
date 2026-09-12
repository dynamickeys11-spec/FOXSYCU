import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import type { Transaction } from './types'

export async function getSupabaseSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getRuntimeState() {
  const { data, error } = await supabase
    .from('foxsycu_runtime_state')
    .select('id, app_name, environment, schema_version, updated_at')
    .eq('id', 'foxsycu-demo')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function recordTransactionForAuthenticatedUser(transaction: Transaction) {
  const session = await getSupabaseSession()
  if (!session?.user) return { persisted: false as const, reason: 'unauthenticated' as const }

  const { error } = await supabase.from('transactions').insert({
    user_id: session.user.id,
    reference: transaction.reference,
    transaction_type: transaction.type ?? (transaction.kind === 'Deposit' ? 'CASH_DEPOSIT' : 'TRANSFER'),
    direction: transaction.amount >= 0 ? 'credit' : 'debit',
    amount: Math.abs(transaction.amount),
    fee: transaction.fee ?? 0,
    currency: transaction.currency,
    status: transaction.status.toLowerCase(),
    counterparty: transaction.counterparty,
    description: transaction.description,
    memo: transaction.memo,
    initiated_at: transaction.initiatedAt ?? new Date().toISOString(),
    effective_date: transaction.effectiveDate ?? transaction.date,
    posted_at: transaction.postedAt ?? new Date().toISOString(),
    available_balance_after: transaction.availableBalanceAfter,
    posted_balance_after: transaction.postedBalanceAfter,
    metadata: transaction.metadata ?? {},
  })
  if (error) throw error
  return { persisted: true as const }
}
