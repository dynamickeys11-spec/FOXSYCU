import type { Transaction } from '../types'

type MovementEvent = {
  input: { rail: string; sourceAccountId?: string | null; amount: number; memo?: string | null; metadata?: Record<string, unknown> }
  result: { movement_id?: string; reference?: string; status?: string; fee?: number }
}

const STORAGE_KEY = 'foxsycu.demo.ledger.runtime.v1'
const SNAPSHOT_KEY = 'foxsycu.transaction-universe.v2'

const status = (value?: string): Transaction['status'] => {
  const v = String(value || '').toLowerCase()
  if (v === 'pending' || v === 'processing') return 'Pending'
  if (v === 'failed') return 'Failed'
  if (v === 'reversed') return 'Reversed'
  return 'Completed'
}

const kind = (rail: string): Transaction['kind'] => rail === 'deposit' ? 'Deposit' : rail === 'internal' ? 'Internal Transfer' : 'Transfer'
const type = (rail: string): Transaction['type'] => rail === 'deposit' ? 'ACH_CREDIT' : rail === 'internal' ? 'INTERNAL_TRANSFER' : rail === 'wire' ? 'WIRE_OUT' : rail === 'zelle_like' ? 'ZELLE_OUT' : 'TRANSFER'

export function applyExternalMovement(event: MovementEvent) {
  if (typeof window === 'undefined' || !event.result.reference || !event.result.movement_id || !event.input.sourceAccountId) return false
  const raw = window.localStorage.getItem(STORAGE_KEY)
  let ledger: any = raw ? (() => { try { return JSON.parse(raw) } catch { return null } })() : null
  if (!ledger || ledger.accountId !== event.input.sourceAccountId || !Array.isArray(ledger.entries)) {
    const snapshot = window.localStorage.getItem(SNAPSHOT_KEY)
    let entries: any[] = []
    try { entries = snapshot ? JSON.parse(snapshot) : [] } catch { entries = [] }
    ledger = { accountId: event.input.sourceAccountId, currency: 'USD', entries }
  }
  if (ledger.entries.some((entry: any) => entry.id === event.result.movement_id || entry.reference === event.result.reference)) return false
  const now = new Date().toISOString()
  const debit = event.input.rail !== 'deposit'
  const amount = Math.abs(Number(event.input.amount || 0))
  const transaction = {
    id: event.result.movement_id,
    accountId: event.input.sourceAccountId,
    entryType: debit ? 'debit' : 'credit',
    kind: kind(event.input.rail),
    type: type(event.input.rail),
    category: 'Money movement',
    description: event.input.memo?.trim() || `${event.input.rail === 'deposit' ? 'USD deposit' : 'USD transfer'}`,
    date: new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    amount: debit ? -amount : amount,
    currency: 'USD',
    status: status(event.result.status),
    reference: event.result.reference,
    direction: debit ? 'DEBIT' : 'CREDIT',
    counterparty: String(event.input.metadata?.counterparty || (event.input.rail === 'deposit' ? 'External funding source' : 'Transfer recipient')),
    memo: event.input.memo || undefined,
    fee: Number(event.result.fee || 0),
    metadata: { ...(event.input.metadata || {}), source: 'supabase-money-movement', movementId: event.result.movement_id },
    createdAt: now,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...ledger, entries: [transaction, ...ledger.entries] }))
  window.dispatchEvent(new CustomEvent('foxsycu-customer-sync'))
  return true
}

export function installExternalMovementBridge() {
  if (typeof window === 'undefined') return () => undefined
  const handler = (event: Event) => applyExternalMovement((event as CustomEvent<MovementEvent>).detail)
  window.addEventListener('foxsycu-external-movement', handler)
  return () => window.removeEventListener('foxsycu-external-movement', handler)
}
