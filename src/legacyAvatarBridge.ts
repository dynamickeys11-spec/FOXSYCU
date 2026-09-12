function money(value: number) {
  return `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function shortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function readLedgerRows() {
  try {
    const raw = localStorage.getItem('foxsycu.transaction-universe.v2')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.transactions) ? parsed.transactions : []
    return rows.filter((row: any) => row && row.id && row.description && row.date)
  } catch {
    return []
  }
}

function transactionMessage(row: any) {
  const amount = Number(row.amount || 0)
  const debit = amount < 0 || row.direction === 'DEBIT'
  const kind = String(row.kind || row.type || '').toLowerCase()
  const counterparty = String(row.counterparty || row.merchant || row.counterparty_name || '').trim()
  const status = String(row.status || 'Completed')
  const subject = status === 'Pending'
    ? 'Transaction pending'
    : debit
      ? (kind.includes('card') || kind.includes('purchase') ? 'Card transaction posted' : 'Payment processed')
      : (kind.includes('interest') ? 'Interest credited' : 'Funds received')

  const body = status === 'Pending'
    ? `${row.description}${counterparty ? ` · ${counterparty}` : ''} is pending for ${money(amount)}.`
    : `${row.description}${counterparty ? ` · ${counterparty}` : ''} ${debit ? 'was posted as a debit' : 'was posted as a credit'} for ${money(amount)}.`

  return { subject, body, debit, status }
}

function clearMessageDetail() {
  document.querySelector('[data-foxsycu-message-detail="true"]')?.remove()
}

function showMessageDetail(row: any) {
  clearMessageDetail()
  const message = transactionMessage(row)
  const backdrop = document.createElement('div')
  backdrop.dataset.foxsycuMessageDetail = 'true'
  backdrop.className = 'drawer-backdrop'
  backdrop.addEventListener('click', clearMessageDetail)

  const drawer = document.createElement('aside')
  drawer.className = 'drawer'
  drawer.addEventListener('click', event => event.stopPropagation())

  const head = document.createElement('div')
  head.className = 'drawer-head'
  const title = document.createElement('div')
  const eyebrow = document.createElement('small')
  eyebrow.textContent = 'SECURE MESSAGE · TRANSACTION'
  const heading = document.createElement('h2')
  heading.textContent = message.subject
  title.append(eyebrow, heading)
  const close = document.createElement('button')
  close.className = 'icon-button'
  close.setAttribute('aria-label', 'Close message')
  close.textContent = '×'
  close.addEventListener('click', clearMessageDetail)
  head.append(title, close)

  const amount = document.createElement('div')
  amount.className = 'drawer-amount'
  const amountValue = document.createElement('strong')
  amountValue.className = message.debit ? '' : 'credit'
  amountValue.textContent = `${message.debit ? '' : '+'}${money(Math.abs(Number(row.amount || 0)))} `
  const status = document.createElement('span')
  status.className = `status status-${String(row.status || 'Completed').toLowerCase()}`
  status.textContent = String(row.status || 'Completed')
  amount.append(amountValue, status)

  const copy = document.createElement('p')
  copy.className = 'small-copy'
  copy.textContent = message.body

  const details = document.createElement('div')
  details.className = 'drawer-details'
  addDetail(details, 'Date', `${row.date}${row.time ? ` · ${row.time}` : ''}`)
  addDetail(details, 'Reference', String(row.reference || '—'))
  addDetail(details, 'Type', String(row.kind || row.type || 'Account activity'))
  addDetail(details, 'Counterparty', String(row.counterparty || row.merchant || '—'))
  addDetail(details, 'Category', String(row.category || row.merchantCategory || '—'))
  addDetail(details, 'Account', String(row.accountId || 'Private Checking'))
  if (row.availableBalanceAfter != null) addDetail(details, 'Balance after', money(Number(row.availableBalanceAfter)))

  const actions = document.createElement('div')
  actions.className = 'drawer-actions'
  const transaction = document.createElement('button')
  transaction.className = 'button secondary'
  transaction.textContent = 'View transaction history'
  transaction.addEventListener('click', () => {
    clearMessageDetail()
    window.location.assign('/transactions')
  })
  actions.append(transaction)

  drawer.append(head, amount, copy, details, actions)
  backdrop.append(drawer)
  document.body.append(backdrop)
}

function addDetail(parent: HTMLElement, label: string, value: string) {
  const item = document.createElement('div')
  const key = document.createElement('span')
  key.textContent = label
  const val = document.createElement('b')
  val.textContent = value
  item.append(key, val)
  parent.append(item)
}

function applyMessageBridge() {
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return
  const container = document.querySelector<HTMLElement>('.message-list')
  if (!container) return
  const rows = readLedgerRows().sort((a: any, b: any) => {
    const left = String(a.created_at || a.createdAt || `${a.date} ${a.time || ''}`)
    const right = String(b.created_at || b.createdAt || `${b.date} ${b.time || ''}`)
    return right.localeCompare(left)
  })
  if (!rows.length) return

  const signature = rows.slice(0, 20).map((row: any) => `${row.id}:${row.status}:${row.amount}`).join('|')
  if (container.dataset.foxsycuSignature === signature) return
  container.dataset.foxsycuSignature = signature
  container.replaceChildren()

  rows.slice(0, 20).forEach((row: any) => {
    const message = transactionMessage(row)
    const article = document.createElement('article')
    article.className = 'message-record'
    article.tabIndex = 0
    article.setAttribute('role', 'button')
    article.setAttribute('aria-label', `Open ${message.subject}`)

    const icon = document.createElement('span')
    icon.className = 'message-icon'
    icon.textContent = message.debit ? '↗' : '↙'

    const content = document.createElement('div')
    const title = document.createElement('b')
    title.textContent = message.subject
    const body = document.createElement('strong')
    body.textContent = message.body
    const meta = document.createElement('small')
    meta.textContent = `${shortDate(row.date)}${row.reference ? ` · ${row.reference}` : ''}`
    content.append(title, body, meta)

    const amount = document.createElement('span')
    amount.className = `message-amount ${message.debit ? 'debit' : 'credit'}`
    amount.textContent = `${message.debit ? '-' : '+'}${money(Math.abs(Number(row.amount || 0)))}`

    article.append(icon, content, amount)
    const open = () => showMessageDetail(row)
    article.addEventListener('click', open)
    article.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    })
    container.append(article)
  })
}

function applyLegacyActivityBridge() {
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return
  try {
    const rows = readLedgerRows()
    if (!rows.length) return
    const completedCredits = rows.filter((row: any) => row?.status === 'Completed' && (row?.direction === 'CREDIT' || Number(row?.amount) > 0)).sort((a: any, b: any) => String(b?.created_at || b?.date || '').localeCompare(String(a?.created_at || a?.date || '')))
    const pending = rows.filter((row: any) => row?.status === 'Pending').sort((a: any, b: any) => String(b?.created_at || b?.date || '').localeCompare(String(a?.created_at || a?.date || '')))
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
      if (latestCredit) value = value.replace('$98,500.00', money(Number(latestCredit.amount))).replace('was posted to Private Checking.', `${String(latestCredit.description || latestCredit.merchant_name || 'Account credit')} was posted to Private Checking.`)
      if (latestPending) value = value.replace('$12,000.00', money(Number(latestPending.amount))).replace('to Alex Smith', `to ${String(latestPending.counterparty || latestPending.counterparty_name || 'beneficiary')}`)
      if (value !== original) text.nodeValue = value
    }
  } catch {}
}

let messageObserver: MutationObserver | null = null

function ensureMessageBridge() {
  if (typeof document === 'undefined') return
  applyMessageBridge()
  if (messageObserver) return
  messageObserver = new MutationObserver(() => {
    if (document.querySelector('.message-list')) applyMessageBridge()
  })
  messageObserver.observe(document.body, { childList: true, subtree: true })
}

export function applyLegacyAvatarBridge(avatarUrl?: string | null) {
  if (typeof document === 'undefined') return
  document.querySelectorAll<HTMLElement>('.avatar').forEach((avatar) => {
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
  ensureMessageBridge()
}
