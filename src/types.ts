export type TransactionStatus = 'Completed' | 'Pending' | 'Failed' | 'Reversed'
export type TransactionKind = 'Deposit' | 'Transfer' | 'Interest' | 'Card Purchase' | 'Fee' | 'Withdrawal' | 'Savings'

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
  category?: string
  counterparty?: string
}

export interface Vault {
  id: string
  name: string
  balance: number
  apy: number
  target: number
  opened: string
  interestEarned: number
}

export interface CustomerSnapshot {
  name: string
  membership: string
  currency: 'USD'
  customerSince: string
  accountOpened: string
  accountType: string
  accountStatus: string
  availableBalance: number
  savingsBalance: number
  pendingBalance: number
  apy: number
  interestEarned: number
  transactions: Transaction[]
  vaults: Vault[]
  beneficiaries: { id: string; name: string; accountLast4: string; currency: 'USD'; added: string }[]
}
