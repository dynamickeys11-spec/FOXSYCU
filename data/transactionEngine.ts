import type { Transaction } from '../types'
import { availableBalance, makeEntry, roundMoney, settledBalance, type AccountLedger } from './ledger'

const STORAGE_KEY = 'foxsycu.demo.ledger.v1'

export interface TransferRequest {
  amount: number
  beneficiary: string
  memo?: string
}

export interface AdminCreditRequest {
  amount: number
  reason: string
  adminId: string
}

export interface EngineResult {
  ledger: AccountLedger
  transaction: Transaction
}

const load = (seed: AccountLedger): AccountLedger => {
  if (typeof window === 'undefined') return seed
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return seed
  try {
    const parsed = JSON.parse(raw) as AccountLedger
    if (parsed.accountId !== seed.accountId || parsed.currency !== seed.currency) return seed
    return parsed
  } catch {
    return seed
  }
}

const save = (ledger: AccountLedger) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger))
}

const validateAmount = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than $0.00.')
  if (roundMoney(amount) !== amount) throw new Error('Amount must use no more than two decimal places.')
}

export function createTransactionEngine(seed: AccountLedger) {
  let ledger = load(seed)

  const post = (entry: ReturnType<typeof makeEntry>): EngineResult => {
    ledger = { ...ledger, entries: [entry, ...ledger.entries] }
    save(ledger)
    return { ledger, transaction: entry }
  }

  return {
    getLedger: () => ledger,
    getSettledBalance: () => settledBalance(ledger),
    getAvailableBalance: () => availableBalance(ledger),

    send: ({ amount, beneficiary, memo }: TransferRequest): EngineResult => {
      validateAmount(amount)
      if (!beneficiary.trim()) throw new Error('Select a beneficiary before sending money.')
      if (amount > availableBalance(ledger)) throw new Error('Insufficient available balance.')

      const now = new Date().toISOString()
      const entry = makeEntry({
        id: `TX-${Date.now()}`,
        accountId: ledger.accountId,
        entryType: 'debit',
        kind: 'Transfer',
        category: 'Beneficiary transfer',
        description: `Transfer to ${beneficiary}`,
        counterparty: beneficiary,
        memo: memo?.trim() || undefined,
        date: new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        amount: -amount,
        currency: 'USD',
        status: 'Completed',
        reference: `TRF-${new Date(now).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
        createdAt: now,
      })
      return post(entry)
    },

    adminCredit: ({ amount, reason, adminId }: AdminCreditRequest): EngineResult => {
      validateAmount(amount)
      if (!adminId.trim()) throw new Error('Admin identity is required.')
      if (!reason.trim()) throw new Error('A reason is required for an admin credit.')

      const now = new Date().toISOString()
      const entry = makeEntry({
        id: `TX-${Date.now()}`,
        accountId: ledger.accountId,
        entryType: 'credit',
        kind: 'Adjustment',
        category: 'Admin adjustment',
        description: 'Simulated administrative credit',
        counterparty: 'FOXSYCU Admin',
        memo: `${reason.trim()} · Admin ${adminId.trim()}`,
        date: new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        amount,
        currency: 'USD',
        status: 'Completed',
        reference: `ADM-${new Date(now).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
        createdAt: now,
      })
      return post(entry)
    },

    reset: () => {
      ledger = seed
      if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
      return ledger
    },
  }
}
