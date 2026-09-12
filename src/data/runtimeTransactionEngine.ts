import type { Transaction } from '../types'
import { availableBalance, makeEntry, roundMoney, settledBalance, type AccountLedger } from './ledger'

const STORAGE_KEY = 'foxsycu.demo.ledger.runtime.v1'
export interface TransferRequest { amount: number; beneficiary: string; memo?: string }
export interface WithdrawalRequest { amount: number; memo?: string }
export interface AdminCreditRequest { amount: number; reason: string; adminId: string }
export interface EngineResult { ledger: AccountLedger; transaction: Transaction }

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

export function createRuntimeTransactionEngine(seed: AccountLedger) {
  let state = load(seed)
  const post = (entry: ReturnType<typeof makeEntry>): EngineResult => {
    if (state.entries.some(e => e.id === entry.id || e.reference === entry.reference)) throw new Error('Duplicate transaction prevented.')
    state = { ...state, entries: [entry, ...state.entries] }
    save(state)
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('foxsycu-customer-sync'))
    return { ledger: state, transaction: entry }
  }
  return {
    getLedger: () => state,
    getSettledBalance: () => settledBalance(state),
    getAvailableBalance: () => availableBalance(state),
    send: ({ amount, beneficiary, memo }: TransferRequest): EngineResult => {
      validate(amount); if (!beneficiary.trim()) throw new Error('Select a beneficiary before sending money.'); if (amount > availableBalance(state)) throw new Error('Insufficient available balance.')
      const now = stamp(); return post(makeEntry({ id: id('TX'), accountId: state.accountId, entryType: 'debit', kind: 'Transfer', category: 'Beneficiary transfer', description: `Transfer to ${beneficiary}`, counterparty: beneficiary, memo: memo?.trim() || undefined, ...parts(now), amount: -amount, currency: 'USD', status: 'Completed', reference: id('TRF'), createdAt: now }))
    },
    withdraw: ({ amount, memo }: WithdrawalRequest): EngineResult => {
      validate(amount); if (amount > availableBalance(state)) throw new Error('Insufficient available balance.')
      const now = stamp(); return post(makeEntry({ id: id('TX'), accountId: state.accountId, entryType: 'debit', kind: 'Withdrawal', category: 'Simulated withdrawal', description: 'USD withdrawal', counterparty: 'FOXSYCU simulated cash', memo: memo?.trim() || undefined, ...parts(now), amount: -amount, currency: 'USD', status: 'Completed', reference: id('WDR'), createdAt: now }))
    },
    adminCredit: ({ amount, reason, adminId }: AdminCreditRequest): EngineResult => {
      validate(amount); if (!adminId.trim()) throw new Error('Admin identity is required.'); if (!reason.trim()) throw new Error('A reason is required for an admin credit.')
      const now = stamp(); return post(makeEntry({ id: id('TX'), accountId: state.accountId, entryType: 'credit', kind: 'Adjustment', category: 'Admin adjustment', description: 'Simulated administrative credit', counterparty: 'FOXSYCU Admin', memo: `${reason.trim()} · Admin ${adminId.trim()}`, ...parts(now), amount, currency: 'USD', status: 'Completed', reference: id('ADM'), createdAt: now }))
    },
    reset: () => { state = seed; if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY); return state },
  }
}
