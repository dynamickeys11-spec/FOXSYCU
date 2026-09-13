export type CanonicalUiCustomer = {
  name: string
  preferredName: string
  membership: string
  customerSince: string
  accountName: string
  accountType: string
  accountStatus: string
  currency: string
  last4: string
  accountOpened: string
  apy: number
}

export function buildCanonicalUiCustomer(profile: any, account: any, vaults: any[]): CanonicalUiCustomer {
  const name = String(profile?.full_name || profile?.preferred_name || '').trim() || 'Customer'
  const preferredName = String(profile?.preferred_name || profile?.full_name || '').trim() || name
  const accountName = String(account?.account_name || '').trim() || 'USD account'
  const opened = account?.created_at ? new Date(account.created_at) : null
  const accountOpened = opened && !Number.isNaN(opened.getTime())
    ? opened.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'
  const savings = vaults.length ? vaults.reduce((sum, v) => sum + Number(v?.apy || 0), 0) / vaults.length : 0
  return {
    name,
    preferredName,
    membership: String(profile?.tier || 'Customer'),
    customerSince: String(profile?.customer_since || '—'),
    accountName,
    accountType: String(account?.account_type || 'checking'),
    accountStatus: String(account?.status || 'active'),
    currency: String(account?.currency || 'USD'),
    last4: String(account?.account_number_last4 || '••••'),
    accountOpened,
    apy: savings,
  }
}

export function formatAccountMask(last4: string, currency = 'USD') {
  const safe = last4.replace(/[^0-9]/g, '').slice(-4)
  return safe ? `•••• ${safe}` : `${currency} account`
}

export function safeDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = String(value).trim()
  if (!raw) return null
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/)
  if (ymd) {
    const d = new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatStatementMonth(value: unknown) {
  const d = safeDate(value)
  return d ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Statement period unavailable'
}
