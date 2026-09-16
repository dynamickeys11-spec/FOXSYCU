import { customer } from './mockData'

export function customerInitials(name = customer.name): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function maskedAccount(last4 = customer.account?.last4 ?? '4821'): string {
  return `•••• ${last4}`
}

export function accountName(): string {
  return `${customer.name} · ${customer.currency}`
}

export function totalVaultBalance(): number {
  return customer.vaults.reduce((sum, vault) => sum + vault.balance, 0)
}

export function totalVaultTarget(): number {
  return customer.vaults.reduce((sum, vault) => sum + (vault.target ?? 0), 0)
}

export function vaultProgress(): number {
  const target = totalVaultTarget()
  return target > 0 ? Math.min(100, Math.round(totalVaultBalance() / target * 100)) : 0
}
