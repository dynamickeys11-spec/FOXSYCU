import type { Transaction } from '../types'
import { availableBalance, makeEntry, roundMoney, settledBalance, type AccountLedger, type LedgerEntry } from './ledger'

const STORAGE_KEY = 'foxsycu.demo.ledger.runtime.v1'
const DB_SNAPSHOT_KEY = 'foxsycu.transaction-universe.v2'
export interface TransferRequest { amount: number; beneficiary: string; memo?: string }
export interface DepositRequest { amount: number; source?: string; memo?: string }
export interface WithdrawalRequest { amount: number; memo?: string }
export interface AdminCreditRequest { amount: number; reason: string; adminId: string }
export interface EngineResult { ledger: AccountLedger; transaction: Transaction }

type SnapshotRow = Partial<Transaction> & { id: string; reference: string; amount: number; direction?: 'credit' | 'debit' | 'CREDIT' | 'DEBIT'; status?: string; accountId?: string }

const load = (seed: AccountLedger): AccountLedger => {
  if (typeof window === 'undefined') return seed
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return seed
  try { const parsed = JSON.parse(raw) as AccountLedger; return parsed.accountId === seed.accountId && parsed.currency === seed.currency && Array.isArray(parsed.entries) ? parsed : seed } catch { return seed }
}
const save = (ledger: AccountLedger) => { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger)) }
const validate = (amount: number) => { if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than $0.00.'); if (roundMoney(amount) !== amount) throw new Error('Amount must use no more than two decimal places.') }
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
const stamp = () => new Date().toISOString()
const parts = (now: string) => { const d = new Date(now); return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) } }

const normalizeStatus = (status?: string): Transaction['status'] => {
  const value = String(status || '').toLowerCase()
  if (value === 'pending' || value === 'processing') return 'Pending'
  if (value === 'failed') return 'Failed'
  if (value === 'reversed') return 'Reversed'
  return 'Completed'
}

const normalizeKind = (row: SnapshotRow): Transaction['kind'] => {
  if (row.kind && ['Deposit','Transfer','Interest','Withdrawal','Payment','Adjustment','SavingsTransfer','Internal Transfer','Card Purchase','Fee','Savings'].includes(row.kind)) return row.kind as Transaction['kind']
  const type = String(row.type || '').toUpperCase()
  if (type.includes('INTEREST')) return 'Interest'
  if (type.includes('CARD')) return 'Card Purchase'
  if (type.includes('FEE')) return 'Fee'
  if (type.includes('WITHDRAW') || type.includes('ATM')) return 'Withdrawal'
  if (type.includes('DEPOSIT') || type.includes('CREDIT')) return 'Deposit'
  return 'Transfer'
}

const hydrateRows = (rows: SnapshotRow[], seed: AccountLedger, existing: LedgerEntry[] = []): AccountLedger => {
  const serverEntries: LedgerEntry[] = rows.map(row => {
    const rawDirection = String(row.direction || row.entryType || '').toLowerCase()
    const debit = rawDirection === 'debit' || Number(row.amount) < 0
    const amount = Math.abs(Number(row.amount || 0))
    const createdAt = row.createdAt || row.postedAt || row.initiatedAt || new Date(`${row.date || new Date().toISOString().slice(0,10)}T${row.time || '00:00:00'}`).toISOString()
    return makeEntry({
      id: row.id,
      accountId: row.accountId || seed.accountId,
      entryType: debit ? 'debit' : 'credit',
      kind: normalizeKind(row),
      type: row.type as Transaction['type'],
      category: row.category || 'USD account activity',
      description: row.description || 'USD account activity',
      date: row.date || new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: row.time || new Date(createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      amount,
      currency: 'USD',
      status: normalizeStatus(row.status),
      reference: row.reference,
      direction: debit ? 'DEBIT' : 'CREDIT',
      counterparty: row.counterparty,
      memo: row.memo,
      fee: row.fee,
      initiatedAt: row.initiatedAt,
      effectiveDate: row.effectiveDate,
      postedAt: row.postedAt,
      availableBalanceAfter: row.availableBalanceAfter,
      postedBalanceAfter: row.postedBalanceAfter,
      metadata: row.metadata,
      createdAt,
    })
  }).filter(entry => Number.isFinite(entry.amount) && entry.reference)

  const serverIds = new Set(serverEntries.map(entry => entry.id))
  const serverRefs = new Set(serverEntries.map(entry => entry.reference))
  const optimisticEntries = existing.filter(entry => !serverIds.has(entry.id) && !serverRefs.has(entry.reference) && entry.metadata?.source === 'supabase-money-movement')
  return { ...seed, entries: [...optimisticEntries, ...serverEntries] }
}

export function createRuntimeTransactionEngine(seed: AccountLedger) {
  let state = load(seed)
  let hasLocalRuntimeState = typeof window !== 'undefined' && Boolean(window.localStorage.getItem(STORAGE_KEY))
  const post = (entry: ReturnType<typeof makeEntry>): EngineResult => {
    if (state.entries.some(e => e.id === entry.id || e.reference === entry.reference)) throw new Error('Duplicate transaction prevented.')
    state = { ...state, entries: [entry, ...state.entries] }
    hasLocalRuntimeState = true
    save(state)
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('foxsycu-customer-sync'))
    return { ledger: state, transaction: entry }
  }
  const deposit = ({ amount, source, memo }: DepositRequest): EngineResult => {
    validate(amount)
    const now = stamp()
    const origin = source?.trim() || 'FOXSYCU simulated deposit source'
    return post(makeEntry({ id: id('TX'), accountId: state.accountId, entryType: 'credit', kind: 'Deposit', category: 'Simulated deposit', description: 'USD deposit', counterparty: origin, memo: memo?.trim() || undefined, ...parts(now), amount, currency: 'USD', status: 'Completed', reference: id('DEP'), createdAt: now }))
  }
  return {
    getLedger: () => state,
    getSettledBalance: () => settledBalance(state),
    getAvailableBalance: () => availableBalance(state),
    hasLocalRuntimeState: () => hasLocalRuntimeState,
    hydrateFromSnapshot: () => {
      if (typeof window === 'undefined') return false
      try {
        const raw = window.localStorage.getItem(DB_SNAPSHOT_KEY)
        if (!raw) return false
        const rows = JSON.parse(raw) as SnapshotRow[]
        if (!Array.isArray(rows) || rows.length === 0) return false
        const next = hydrateRows(rows, seed, state.entries)
        const changed = JSON.stringify(next.entries) !== JSON.stringify(state.entries)
        state = next
        save(state)
        hasLocalRuntimeState = true
        return changed
      } catch { return false }
    },
    deposit,
    send: ({ amount, beneficiary, memo }: TransferRequest): EngineResult => {
      validate(amount); if (!beneficiary.trim()) throw new Error('Select a beneficiary before sending money.'); if (amount > availableBalance(state)) throw new Error('Insufficient available balance.')
      const now = stamp(); return post(makeEntry({ id: id('TX'), accountId: state.accountId, entryType: 'debit', kind: 'Transfer', category: 'Beneficiary transfer', description: `Transfer to ${beneficiary}`, counterparty: beneficiary, memo: memo?.trim() || undefined, ...parts(now), amount: -amount, currency: 'USD', status: 'Completed', reference: id('TRF'), createdAt: now }))
    },
    withdraw: ({ amount, memo }: WithdrawalRequest): EngineResult => {
      validate(amount); if (amount > availableBalance(state)) throw new Error('Insufficient available balance.')
      const now = stamp(); return post(makeEntry({ id: id('TX'), accountId: state.accountId, entryType: 'debit', kind: 'Withdrawal', category: 'Simulated withdrawal', description: 'USD withdrawal', counterparty: 'FOXSYCU simulated cash', memo: memo?.trim() || undefined, ...parts(now), amount: -amount, currency: 'USD', status: 'Completed', reference: id('WDR'), createdAt: now }))
    },
    adminCredit: ({ amount, reason, adminId }: AdminCreditRequest): EngineResult => {
      if (adminId === 'customer-funding-review') return deposit({ amount, source: 'FOXSYCU simulated deposit source', memo: reason })
      validate(amount); if (!adminId.trim()) throw new Error('Admin identity is required.'); if (!reason.trim()) throw new Error('A reason is required for an admin credit.')
      const now = stamp(); return post(makeEntry({ id: id('TX'), accountId: state.accountId, entryType: 'credit', kind: 'Adjustment', category: 'Admin adjustment', description: 'Simulated administrative credit', counterparty: 'FOXSYCU Admin', memo: `${reason.trim()} · Admin ${adminId.trim()}`, ...parts(now), amount, currency: 'USD', status: 'Completed', reference: id('ADM'), createdAt: now }))
    },
    reset: () => { state = seed; hasLocalRuntimeState = false; if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY); return state },
  }
}
