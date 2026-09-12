export type TransactionStatus = 'Completed' | 'Pending' | 'Failed' | 'Reversed'

export type TransactionType =
  | 'TRANSFER' | 'ACH_CREDIT' | 'ACH_DEBIT' | 'WIRE_IN' | 'WIRE_OUT'
  | 'ZELLE_IN' | 'ZELLE_OUT' | 'CARD_PURCHASE' | 'CARD_REFUND'
  | 'ATM_WITHDRAWAL' | 'CASH_DEPOSIT' | 'DIRECT_DEPOSIT' | 'INTEREST_CREDIT'
  | 'FEE' | 'BILL_PAYMENT' | 'INTERNAL_TRANSFER' | 'SCHEDULED_TRANSFER'

export type TransactionKind = 'Deposit' | 'Transfer' | 'Interest' | 'Card Purchase' | 'Fee' | 'Withdrawal' | 'Savings'

export interface TransactionParty { name: string; accountLast4?: string; email?: string; phone?: string }
export interface TransactionInstitution { name: string; routingLast4?: string; type?: string }

export interface Transaction {
  id: string
  reference: string
  type?: TransactionType
  kind: TransactionKind
  status: TransactionStatus
  amount: number
  currency: 'USD'
  direction?: 'CREDIT' | 'DEBIT'
  sourceAccount?: TransactionParty
  destinationAccount?: TransactionParty
  counterparty?: string
  counterpartyDetails?: TransactionParty
  institution?: TransactionInstitution
  merchant?: string
  merchantCategory?: string
  initiatedAt?: string
  effectiveDate?: string
  postedAt?: string
  date: string
  time: string
  memo?: string
  fee?: number
  availableBalanceAfter?: number
  postedBalanceAfter?: number
  metadata?: Record<string, string | number | boolean | null>
  description: string
  category?: string
}

export interface Vault { id: string; name: string; balance: number; apy: number; target: number; opened: string; interestEarned: number }

export interface CustomerSnapshot {
  name: string; membership: string; currency: 'USD'; customerSince: string; accountOpened: string
  accountType: string; accountStatus: string; availableBalance: number; savingsBalance: number
  pendingBalance: number; apy: number; interestEarned: number; transactions: Transaction[]
  vaults: Vault[]
  savingsVaults: Vault[]
  beneficiaries: { id: string; name: string; accountLast4: string; currency: 'USD'; added: string }[]
}
