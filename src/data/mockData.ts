import type { CustomerSnapshot, Transaction } from '../types'
import { assertReconciled, availableBalance, makeEntry, type AccountLedger } from './ledger'

const ACCOUNT_ID = 'acct_usd_personal_4821'
const OPENING_BALANCE = 2_679_325
const TARGET_BALANCE = 5_000_000

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const isoDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day)).toISOString()
const displayDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const displayTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

function buildSyntheticLedger(): AccountLedger {
  const entries: ReturnType<typeof makeEntry>[] = []
  let monthIndex = 0

  for (let year = 2021; year <= 2026; year += 1) {
    const firstMonth = year === 2021 ? 4 : 1
    const lastMonth = year === 2026 ? 9 : 12

    for (let month = firstMonth; month <= lastMonth; month += 1) {
      const base = isoDate(year, month, 1)
      const credit = 42_000 + (monthIndex % 6) * 8_500 + (monthIndex % 4) * 1_250
      const debit = 18_000 + (monthIndex % 5) * 4_200 + (monthIndex % 3) * 900

      entries.push(makeEntry({
        id: `TX-${String(1000 + entries.length + 1)}`,
        accountId: ACCOUNT_ID,
        entryType: 'credit',
        kind: monthIndex % 4 === 0 ? 'Deposit' : 'Transfer',
        category: monthIndex % 4 === 0 ? 'Income' : 'Client settlement',
        description: monthIndex % 4 === 0 ? 'Business proceeds received' : 'Client settlement received',
        counterparty: monthIndex % 4 === 0 ? 'External funding source' : 'Client settlement',
        memo: 'Synthetic historical activity',
        date: displayDate(base),
        time: '09:15 AM',
        amount: credit,
        currency: 'USD',
        status: 'Completed',
        reference: `CR-${year}${String(month).padStart(2, '0')}-${String(monthIndex + 1).padStart(4, '0')}`,
        createdAt: base,
      }))

      const debitDate = isoDate(year, month, 6)
      entries.push(makeEntry({
        id: `TX-${String(1000 + entries.length + 1)}`,
        accountId: ACCOUNT_ID,
        entryType: 'debit',
        kind: monthIndex % 3 === 0 ? 'Payment' : 'Transfer',
        category: monthIndex % 3 === 0 ? 'Card / merchant payment' : 'Outgoing transfer',
        description: monthIndex % 3 === 0 ? 'Card and merchant payments' : 'Outgoing account transfer',
        counterparty: monthIndex % 3 === 0 ? 'Merchant network' : 'External beneficiary',
        memo: 'Synthetic historical activity',
        date: displayDate(debitDate),
        time: '02:40 PM',
        amount: -debit,
        currency: 'USD',
        status: 'Completed',
        reference: `DR-${year}${String(month).padStart(2, '0')}-${String(monthIndex + 1).padStart(4, '0')}`,
        createdAt: debitDate,
      }))

      if (monthIndex % 9 === 0) {
        const largeDebit = 35_000 + monthIndex * 250
        const transactionDate = isoDate(year, month, 12)
        entries.push(makeEntry({
          id: `TX-${String(1000 + entries.length + 1)}`,
          accountId: ACCOUNT_ID,
          entryType: 'debit',
          kind: 'Transfer',
          category: 'Large transfer',
          description: 'Scheduled portfolio transfer',
          counterparty: 'Investment account',
          memo: 'Synthetic scheduled transfer',
          date: displayDate(transactionDate),
          time: '10:20 AM',
          amount: -largeDebit,
          currency: 'USD',
          status: 'Completed',
          reference: `TRF-${year}${String(month).padStart(2, '0')}-${String(monthIndex + 1).padStart(4, '0')}`,
          createdAt: transactionDate,
        }))
      }

      if (monthIndex % 7 === 3) {
        const settlement = 12_500 + monthIndex * 175
        const transactionDate = isoDate(year, month, 18)
        entries.push(makeEntry({
          id: `TX-${String(1000 + entries.length + 1)}`,
          accountId: ACCOUNT_ID,
          entryType: 'credit',
          kind: 'Deposit',
          category: 'Settlement',
          description: 'Additional client settlement',
          counterparty: 'Client settlement account',
          memo: 'Synthetic historical activity',
          date: displayDate(transactionDate),
          time: '04:05 PM',
          amount: settlement,
          currency: 'USD',
          status: 'Completed',
          reference: `SET-${year}${String(month).padStart(2, '0')}-${String(monthIndex + 1).padStart(4, '0')}`,
          createdAt: transactionDate,
        }))
      }

      monthIndex += 1
    }
  }

  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
  return { accountId: ACCOUNT_ID, currency: 'USD', openingBalance: OPENING_BALANCE, entries }
}

const ledger = buildSyntheticLedger()
assertReconciled(ledger, TARGET_BALANCE)

const vaults = [
  { id: 'v1', name: 'Emergency Vault', balance: 250_000, apy: 4.5, target: 300_000 },
  { id: 'v2', name: 'Property Deposit', balance: 300_000, apy: 4.5, target: 500_000 },
  { id: 'v3', name: 'Travel Vault', balance: 75_000, apy: 4.5, target: 100_000 },
]

const transactions: Transaction[] = ledger.entries.map(entry => ({ ...entry }))
const savingsBalance = money(vaults.reduce((sum, vault) => sum + vault.balance, 0))
const interestEarned = money(savingsBalance * 0.045 / 12)

export const customer: CustomerSnapshot = {
  name: 'John Doe',
  membership: 'Premium User',
  currency: 'USD',
  availableBalance: availableBalance(ledger),
  savingsBalance,
  apy: 4.5,
  interestEarned,
  transactions,
  vaults,
  account: {
    id: ACCOUNT_ID,
    type: 'checking',
    currency: 'USD',
    last4: '4821',
    openingBalance: OPENING_BALANCE,
    opened: 'April 2021',
  },
}
