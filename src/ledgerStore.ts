import { useSyncExternalStore } from 'react'
import { customer as seed } from './data/mockData'
import { calculateBalances } from './transactionEngine'
import type { Transaction } from './types'

const key = 'foxsycu.transaction-universe.v2'
const legacyKey = 'foxsycu.transactions'
const read = (): Transaction[] => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : seed.transactions
  } catch {
    return seed.transactions
  }
}
let current: Transaction[] = read()
try {
  localStorage.setItem(key, JSON.stringify(current))
  localStorage.setItem(legacyKey, JSON.stringify(current))
} catch {}
const listeners = new Set<() => void>()
const emit = () => {
  localStorage.setItem(key, JSON.stringify(current))
  localStorage.setItem(legacyKey, JSON.stringify(current))
  listeners.forEach(fn => fn())
  window.dispatchEvent(new CustomEvent('foxsycu-ledger'))
}

export function addTransaction(t: Transaction) {
  current = [t, ...current]
  emit()
}

export function useBankLedger() {
  const tx = useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn) }, () => current, () => seed.transactions)
  const balances = calculateBalances(tx)
  return { tx, posted: balances.posted, available: balances.available, pending: balances.pendingDebits, add: addTransaction }
}
