import type { Transaction } from '../types'

export type LedgerEntryType = 'credit' | 'debit'

export interface LedgerEntry extends Transaction {
  accountId: string
  entryType: LedgerEntryType
  category: string
  counterparty?: string
  memo?: string
  synthetic: true
  createdAt: string
}

export interface AccountLedger {
  accountId: string
  currency: 'USD'
  openingBalance: number
  entries: LedgerEntry[]
}

export function amountForEntry(entry: LedgerEntry): number {
  return entry.entryType === 'credit' ? Math.abs(entry.amount) : -Math.abs(entry.amount)
}

export function settledBalance(ledger: AccountLedger): number {
  return roundMoney(ledger.openingBalance + ledger.entries.filter(e => e.status === 'Completed').reduce((sum, entry) => sum + amountForEntry(entry), 0))
}

export function availableBalance(ledger: AccountLedger): number {
  const settled = settledBalance(ledger)
  const pending = ledger.entries.filter(e => e.status === 'Pending').reduce((sum, entry) => sum + amountForEntry(entry), 0)
  return roundMoney(settled + pending)
}

export function totalCredits(entries: LedgerEntry[]): number {
  return roundMoney(entries.filter(e => e.status === 'Completed' && e.entryType === 'credit').reduce((sum, e) => sum + Math.abs(e.amount), 0))
}

export function totalDebits(entries: LedgerEntry[]): number {
  return roundMoney(entries.filter(e => e.status === 'Completed' && e.entryType === 'debit').reduce((sum, e) => sum + Math.abs(e.amount), 0))
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function assertReconciled(ledger: AccountLedger, expected: number): void {
  const actual = settledBalance(ledger)
  if (Math.abs(actual - expected) > 0.005) {
    throw new Error(`Synthetic ledger reconciliation failed: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)}`)
  }
}

export function makeEntry(input: Omit<LedgerEntry, 'synthetic' | 'amount'> & { amount: number }): LedgerEntry {
  return { ...input, amount: roundMoney(input.amount), synthetic: true }
}
