import { customer as seed } from './mockData'

export const CANONICAL_ACCOUNT = {
  accountId: seed.account.id,
  accountType: seed.account.type,
  currency: seed.account.currency,
  last4: seed.account.last4,
  openingBalance: seed.account.openingBalance,
  opened: seed.account.opened,
  targetBalance: seed.availableBalance,
  pendingAmount: 0,
} as const

export const CANONICAL_VAULTS = seed.vaults.map(v => ({
  name: v.name,
  balance: v.balance,
  target: v.target,
  apy: v.apy,
  opened: v.opened,
}))

export const CANONICAL_SAVINGS_BALANCE = CANONICAL_VAULTS.reduce((sum, vault) => sum + vault.balance, 0)

export const CANONICAL_BENEFICIARIES = seed.beneficiaries.map(b => ({
  name: b.name,
  accountMasked: `••••${b.accountLast4}`,
  accountLast4: b.accountLast4,
  type: 'individual' as const,
}))

export function makeAccountName(ownerName: string) {
  const name = ownerName.trim()
  return name ? `${name} Checking` : 'Checking Account'
}
