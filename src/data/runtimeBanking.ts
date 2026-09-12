import { useEffect, useState } from 'react'
import { customer, ledger } from './mockData'
import { amountForEntry } from './ledger'
import { createRuntimeTransactionEngine } from './runtimeTransactionEngine'

export const runtimeEngine = createRuntimeTransactionEngine(ledger)

export function refreshCustomerSnapshot() {
  runtimeEngine.hydrateFromSnapshot()
  const current = runtimeEngine.getLedger()
  customer.availableBalance = runtimeEngine.getAvailableBalance()
  customer.transactions = current.entries.map(entry => ({ ...entry, amount: amountForEntry(entry) }))
  customer.interestEarned = Math.round(current.entries.filter(entry => entry.kind === 'Interest' && entry.entryType === 'credit' && entry.status === 'Completed').reduce((sum, entry) => sum + Math.abs(entry.amount), 0) * 100) / 100
}

export function useRuntimeRefresh() {
  const [, setVersion] = useState(0)
  useEffect(() => {
    refreshCustomerSnapshot()
    const onSync = () => {
      refreshCustomerSnapshot()
      setVersion(value => value + 1)
    }
    window.addEventListener('foxsycu-customer-sync', onSync)
    return () => window.removeEventListener('foxsycu-customer-sync', onSync)
  }, [])
}
