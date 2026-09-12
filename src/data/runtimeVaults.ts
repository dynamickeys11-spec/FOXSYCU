import { customer } from './mockData'
import type { Vault } from '../types'

const STORAGE_KEY = 'foxsycu.demo.vaults.runtime.v1'
const SYNC_EVENT = 'foxsycu-customer-sync'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function persist(vaults: Vault[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vaults))
}

function notify(): void {
  if (canUseStorage()) window.dispatchEvent(new CustomEvent(SYNC_EVENT))
}

function syncCustomer(vaults: Vault[]): void {
  customer.vaults = vaults
  customer.savingsVaults = vaults
  customer.savingsBalance = Math.round(vaults.reduce((sum, vault) => sum + vault.balance, 0) * 100) / 100
}

export function hydrateRuntimeVaults(): void {
  if (!canUseStorage()) return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Vault[]
    if (Array.isArray(parsed) && parsed.every(vault => vault && typeof vault.id === 'string' && typeof vault.name === 'string' && typeof vault.balance === 'number' && typeof vault.target === 'number' && typeof vault.apy === 'number' && typeof vault.opened === 'string')) {
      syncCustomer(parsed)
      notify()
    }
  } catch {
    // Ignore malformed local runtime state and keep the checked-in synthetic defaults.
  }
}

export function createRuntimeVault(name: string, target: number): Vault {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Vault name is required.')
  if (!Number.isFinite(target) || target <= 0) throw new Error('Target amount must be greater than zero.')
  if (Math.round(target * 100) !== target * 100) throw new Error('Target amount can have at most two decimal places.')

  const vault: Vault = {
    id: `vault_${Date.now().toString(36)}`,
    name: cleanName,
    balance: 0,
    apy: customer.apy,
    target: Math.round(target * 100) / 100,
    interestEarned: 0,
    opened: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }

  const vaults = [...customer.vaults, vault]
  syncCustomer(vaults)
  persist(vaults)
  notify()
  return vault
}
