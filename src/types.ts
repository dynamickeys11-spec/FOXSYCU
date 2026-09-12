export type TransactionStatus = 'Completed' | 'Pending' | 'Failed' | 'Reversed'
export type TransactionKind = 'Deposit' | 'Transfer' | 'Interest' | 'Withdrawal' | 'Payment' | 'Adjustment' | 'SavingsTransfer' | 'Internal Transfer' | 'Card Purchase' | 'Fee' | 'Savings'
export type TransactionType = 'TRANSFER' | 'INTERNAL_TRANSFER' | 'ACH_CREDIT' | 'CARD_PURCHASE' | 'INTEREST_CREDIT' | 'FEE' | 'ATM_WITHDRAWAL' | 'WIRE_OUT' | 'ZELLE_OUT' | 'SCHEDULED_TRANSFER'

export interface Transaction {
  id: string
  kind: TransactionKind
  type?: TransactionType
  description: string
  date: string
  time: string
  amount: number
  currency: 'USD'
  status: TransactionStatus
  reference: string
  direction?: 'CREDIT' | 'DEBIT'
  accountId?: string
  entryType?: 'credit' | 'debit'
  category?: string
  counterparty?: string
  counterpartyDetails?: { name: string; email?: string; accountLast4?: string }
  sourceAccount?: { name: string; accountLast4: string }
  destinationAccount?: { name: string; accountLast4: string }
  institution?: { name: string; type: string }
  merchant?: string
  merchantCategory?: string
  memo?: string
  fee?: number
  initiatedAt?: string
  effectiveDate?: string
  postedAt?: string
  availableBalanceAfter?: number
  postedBalanceAfter?: number
  metadata?: Record<string, unknown>
  synthetic?: true
  createdAt?: string
}

export interface Vault {
  id: string
  name: string
  balance: number
  apy: number
  target?: number
  interestEarned?: number
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
  savingsVaults: Vault[]
  account?: { id: string; type: 'checking'; currency: 'USD'; last4: string; openingBalance: number; opened: string }
}
