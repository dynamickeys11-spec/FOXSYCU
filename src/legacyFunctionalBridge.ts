import { supabase } from './supabaseClient'

let installed = false
let observer: MutationObserver | null = null
let refreshTimer: number | null = null

const money = (value: number) => `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function getRows() {
  try {
    const raw = localStorage.getItem('foxsycu.transaction-universe.v2')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.transactions) ? parsed.transactions : []
  } catch {
    return []
  }
}

function modal(title: string, body: HTMLElement, onClose?: () => void) {
  const existing = document.getElementById('foxsycu-legacy-live-modal')
  existing?.remove()
  const backdrop = document.createElement('div')
  backdrop.id = 'foxsycu-legacy-live-modal'
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(10,18,32,.58);z-index:9999;display:grid;place-items:center;padding:20px'
  const dialog = document.createElement('div')
  dialog.style.cssText = 'width:min(520px,100%);background:#fff;border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.28);font-family:Inter,system-ui,sans-serif'
  const head = document.createElement('div')
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px'
  const h = document.createElement('h2')
  h.textContent = title
  h.style.cssText = 'margin:0;font-size:20px'
  const close = document.createElement('button')
  close.textContent = '×'
  close.style.cssText = 'border:0;background:transparent;font-size:28px;cursor:pointer;line-height:1'
  close.onclick = () => { backdrop.remove(); onClose?.() }
  head.append(h, close)
  dialog.append(head, body)
  backdrop.append(dialog)
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close.click() })
  document.body.append(backdrop)
}

function field(label: string, value = '', type = 'text') {
  const wrap = document.createElement('label')
  wrap.style.cssText = 'display:grid;gap:7px;margin:12px 0;font-size:13px;font-weight:600'
  const span = document.createElement('span')
  span.textContent = label
  const input = document.createElement('input')
  input.type = type
  input.value = value
  input.style.cssText = 'width:100%;box-sizing:border-box;border:1px solid #d8dee8;border-radius:10px;padding:11px 12px;font:inherit;font-weight:500'
  wrap.append(span, input)
  return { wrap, input }
}

function actionButton(label: string, primary = false) {
  const button = document.createElement('button')
  button.textContent = label
  button.style.cssText = `border:1px solid ${primary ? '#0057b8' : '#d8dee8'};background:${primary ? '#0057b8' : '#fff'};color:${primary ? '#fff' : '#172033'};border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer`
  return button
}

async function currentUser() {
  return (await supabase.auth.getUser()).data.user
}

async function toggleCard() {
  const user = await currentUser()
  if (!user) return
  const { data: card } = await supabase.from('card_controls').select('id,status').eq('user_id', user.id).maybeSingle()
  if (!card) return
  const next = card.status === 'frozen' ? 'active' : 'frozen'
  await supabase.from('card_controls').update({ status: next, updated_at: new Date().toISOString() }).eq('id', card.id)
  window.dispatchEvent(new CustomEvent('foxsycu-customer-sync'))
  window.location.reload()
}

async function requestCardService(requestType: string) {
  const user = await currentUser()
  if (!user) return
  const { data: card } = await supabase.from('card_controls').select('id').eq('user_id', user.id).maybeSingle()
  await supabase.from('card_service_requests').insert({ user_id: user.id, card_control_id: card?.id ?? null, request_type: requestType, status: 'open' })
  alert(`Your ${requestType.replaceAll('_', ' ')} request has been recorded in the demo support workflow.`)
}

function addBeneficiaryModal() {
  const name = field('Name')
  const last4 = field('Account last 4')
  last4.input.inputMode = 'numeric'
  last4.input.maxLength = 4
  const type = field('Type', 'individual')
  const save = actionButton('Save beneficiary', true)
  const cancel = actionButton('Cancel')
  const body = document.createElement('div')
  const note = document.createElement('p')
  note.textContent = 'This adds a recipient to the connected demo customer record.'
  note.style.cssText = 'color:#657086;font-size:13px;margin:0 0 14px'
  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:18px'
  actions.append(cancel, save)
  body.append(note, name.wrap, last4.wrap, type.wrap, actions)
  const close = () => document.getElementById('foxsycu-legacy-live-modal')?.remove()
  cancel.onclick = close
  save.onclick = async () => {
    if (!name.input.value.trim() || !/^\d{4}$/.test(last4.input.value)) return alert('Enter a name and exactly four account digits.')
    const user = await currentUser()
    if (!user) return
    const { error } = await supabase.from('beneficiaries').insert({ user_id: user.id, name: name.input.value.trim(), account_masked: `••••${last4.input.value}`, beneficiary_type: type.input.value.trim() || 'individual', status: 'active' })
    if (error) return alert(error.message)
    close()
    window.location.reload()
  }
  modal('Add beneficiary', body)
}

function composeMessageModal() {
  const subject = field('Subject')
  const message = field('Message')
  message.input.setAttribute('placeholder', 'Describe what you need help with')
  const send = actionButton('Send secure request', true)
  const cancel = actionButton('Cancel')
  const body = document.createElement('div')
  const note = document.createElement('p')
  note.textContent = 'Messages are routed into the demo support case workflow.'
  note.style.cssText = 'color:#657086;font-size:13px;margin:0 0 14px'
  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:18px'
  actions.append(cancel, send)
  body.append(note, subject.wrap, message.wrap, actions)
  cancel.onclick = () => document.getElementById('foxsycu-legacy-live-modal')?.remove()
  send.onclick = async () => {
    if (!subject.input.value.trim() || !message.input.value.trim()) return alert('Enter a subject and message.')
    const user = await currentUser()
    if (!user) return
    const caseNumber = `FXS-${Date.now().toString().slice(-8)}`
    const { error } = await supabase.from('support_cases').insert({ user_id: user.id, case_number: caseNumber, subject: `${subject.input.value.trim()} — ${message.input.value.trim()}`, status: 'open', priority: 'normal' })
    if (error) return alert(error.message)
    document.getElementById('foxsycu-legacy-live-modal')?.remove()
    alert(`Secure request ${caseNumber} created.`)
  }
  modal('New secure message', body)
}

function refreshStatements() {
  if (!location.pathname.endsWith('/statements') && location.pathname !== '/statements') return
  const rows = getRows()
  const months = [...new Set(rows.map((row: any) => String(row?.date || row?.effective_date || '').slice(0, 7)).filter(Boolean))].sort().reverse()
  const panels = Array.from(document.querySelectorAll('.panel'))
  const statementPanels = panels.filter((panel) => /^(20\d{2})$/.test(panel.querySelector('h2')?.textContent?.trim() || ''))
  if (!statementPanels.length || !months.length) return
  const years = [...new Set(months.map(m => m.slice(0, 4)))]
  statementPanels.forEach((panel) => panel.remove())
  const anchor = document.querySelector('.statement-hero')
  if (!anchor?.parentElement) return
  years.forEach(year => {
    const section = document.createElement('section')
    section.className = 'panel'
    section.innerHTML = `<div class="panel-head"><div><h2>${year}</h2><p>${year === new Date().getFullYear().toString() ? 'Current activity' : 'Statement activity from the demo ledger'}</p></div></div>`
    const list = document.createElement('div')
    list.className = 'document-list'
    months.filter(m => m.startsWith(year)).forEach(month => {
      const [y, m] = month.split('-')
      const date = new Date(Number(y), Number(m) - 1, 1)
      const row = getRows().filter((tx: any) => String(tx?.date || tx?.effective_date || '').startsWith(month))
      const net = row.reduce((sum: number, tx: any) => sum + Number(tx?.amount || 0), 0)
      const item = document.createElement('article')
      item.innerHTML = `<span class="doc-icon">▤</span><div><b>${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} statement</b><small>Private Checking · ${row.length} transactions · Net movement ${money(net)}</small></div>`
      const view = actionButton('View')
      view.className = 'button secondary small'
      view.onclick = () => window.print()
      item.append(view)
      list.append(item)
    })
    section.append(list)
    anchor.parentElement?.append(section)
  })
}

function persistSettings() {
  const settings = JSON.parse(localStorage.getItem('foxsycu.legacy.settings') || '{"twoFactor":true,"loginAlerts":true,"paperless":true}')
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.switch'))
  buttons.forEach((button, index) => {
    const key = ['twoFactor', 'loginAlerts', 'paperless'][index]
    if (!key) return
    button.onclick = () => {
      settings[key] = !settings[key]
      localStorage.setItem('foxsycu.legacy.settings', JSON.stringify(settings))
      button.classList.toggle('on', settings[key])
    }
    button.classList.toggle('on', !!settings[key])
  })
}

function installClickBridge() {
  if (installed) return
  installed = true
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest('button') as HTMLButtonElement | null
    if (!button) return
    const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (text === 'add beneficiary') { event.preventDefault(); event.stopPropagation(); addBeneficiaryModal(); return }
    if (text === 'new message') { event.preventDefault(); event.stopPropagation(); composeMessageModal(); return }
    if (text === 'lock card' || text === 'unlock card') { event.preventDefault(); event.stopPropagation(); void toggleCard(); return }
    if (text === 'replace card') { event.preventDefault(); event.stopPropagation(); void requestCardService('replace_card'); return }
    if (text === 'report card') { event.preventDefault(); event.stopPropagation(); void requestCardService('report_card'); return }
    if (text === 'card controls') { event.preventDefault(); event.stopPropagation(); return }
  }, true)
}

function refresh() {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => { refreshTimer = null; refreshStatements(); persistSettings() }, 60)
}

export function installLegacyFunctionalBridge() {
  if (typeof document === 'undefined') return
  installClickBridge()
  refresh()
  observer?.disconnect()
  observer = new MutationObserver(refresh)
  observer.observe(document.body, { subtree: true, childList: true })
}
