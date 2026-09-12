export type TransactionStatus = 'Completed' | 'Pending' | 'Failed' | 'Reversed'
export type TransactionKind = 'Deposit' | 'Transfer' | 'Interest' | 'Withdrawal' | 'Payment' | 'Internal Transfer' | 'Adjustment'

export interface Transaction {
  id: string
  kind: TransactionKind
  description: string
  date: string
  time: string
  amount: number
  currency: 'USD'
  status: TransactionStatus
  reference: string
  accountId?: string
  entryType?: 'credit' | 'debit'
  category?: string
  counterparty?: string
  memo?: string
  synthetic?: true
  createdAt?: string
}

export interface Vault {
  id: string
  name: string
  balance: number
  apy: number
  target?: number
}

export interface CustomerSnapshot {
  name: string
  membership: string
  currency: 'USD'
  availableBalance: number
  savingsBalance: number
  apy: number
  interestEarned: number
  transactions: Transaction[]
  vaults: Vault[]
  account?: {
    id: string
    type: 'checking'
    currency: 'USD'
    last4: string
    openingBalance: number
    opened: string
  }
}
