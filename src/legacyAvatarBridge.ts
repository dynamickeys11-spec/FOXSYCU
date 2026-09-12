import { installLegacyFunctionalBridge } from './legacyFunctionalBridge'

function money(value: number) {
  return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function applyLegacyActivityBridge() {
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem('foxsycu.transaction-universe.v2')
    if (!raw) return
    const parsed = JSON.parse(raw)
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.transactions) ? parsed.transactions : []
    if (!rows.length) return

    const completedCredits = rows
      .filter((row: any) => row?.status === 'Completed' && (row?.direction === 'CREDIT' || Number(row?.amount) > 0))
      .sort((a: any, b: any) => String(b?.created_at || b?.date || '').localeCompare(String(a?.created_at || a?.date || '')))
    const pending = rows
      .filter((row: any) => row?.status === 'Pending')
      .sort((a: any, b: any) => String(b?.created_at || b?.date || '').localeCompare(String(a?.created_at || a?.date || '')))

    const latestCredit = completedCredits[0]
    const latestPending = pending[0]
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    let node: Node | null
    while ((node = walker.nextNode())) nodes.push(node as Text)

    for (const text of nodes) {
      if (!text.nodeValue) continue
      const original = text.nodeValue
      let value = original
      if (latestCredit) {
        const amount = Number(latestCredit.amount)
        const description = String(latestCredit.description || latestCredit.merchant_name || 'Account credit')
        value = value
          .replace('$98,500.00', money(amount))
          .replace('was posted to Private Checking.', `${description} was posted to Private Checking.`)
      }
      if (latestPending) {
        const amount = Number(latestPending.amount)
        const counterparty = String(latestPending.counterparty || latestPending.counterparty_name || 'beneficiary')
        value = value
          .replace('$12,000.00', money(amount))
          .replace('to Alex Smith', `to ${counterparty}`)
      }
      if (value !== original) text.nodeValue = value
    }
  } catch {
    // The notification bridge is non-critical; leave the banking UI untouched if local data is unavailable.
  }
}

export function applyLegacyAvatarBridge(avatarUrl?: string | null) {
  if (typeof document === 'undefined') return
  const avatars = document.querySelectorAll<HTMLElement>('.avatar')
  avatars.forEach((avatar) => {
    if (avatarUrl) {
      avatar.style.backgroundImage = `url("${avatarUrl}")`
      avatar.style.backgroundSize = 'cover'
      avatar.style.backgroundPosition = 'center'
      avatar.style.backgroundRepeat = 'no-repeat'
      avatar.style.color = 'transparent'
      avatar.setAttribute('aria-label', 'Customer profile picture')
    } else {
      avatar.style.backgroundImage = ''
      avatar.style.backgroundSize = ''
      avatar.style.backgroundPosition = ''
      avatar.style.backgroundRepeat = ''
      avatar.style.color = ''
      avatar.removeAttribute('aria-label')
    }
  })
  applyLegacyActivityBridge()
  installLegacyFunctionalBridge()
}
