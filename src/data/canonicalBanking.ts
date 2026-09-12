export const CANONICAL_ACCOUNT = {
  accountId: 'acct_usd_personal_4821',
  accountType: 'checking' as const,
  accountName: 'FOXSYCU Private Checking',
  currency: 'USD' as const,
  last4: '4821',
  openingBalance: 2_679_325,
  opened: 'April 2021',
  targetBalance: 5_000_000,
  pendingAmount: 0,
}

export const CANONICAL_VAULTS = [
  { name: 'Emergency Vault', balance: 250_000, target: 300_000, apy: 4.5, opened: 'April 2021' },
  { name: 'Property Deposit', balance: 300_000, target: 500_000, apy: 4.5, opened: 'June 2022' },
  { name: 'Travel Vault', balance: 75_000, target: 100_000, apy: 4.5, opened: 'March 2024' },
] as const

export const CANONICAL_SAVINGS_BALANCE = CANONICAL_VAULTS.reduce((sum, vault) => sum + vault.balance, 0)

export const CANONICAL_BENEFICIARIES = [
  { name: 'Alex Smith', accountMasked: '••••1920', accountLast4: '1920', type: 'individual' },
  { name: 'Maria Johnson', accountMasked: '••••4472', accountLast4: '4472', type: 'individual' },
  { name: 'Northstar Holdings', accountMasked: '••••8104', accountLast4: '8104', type: 'business' },
] as const
