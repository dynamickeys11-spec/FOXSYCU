import { supabase } from './supabaseClient'

let installed = false
let timer: number | null = null

const esc = (value: unknown) => String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch] || ch))

async function hydrateMessages() {
  if (location.pathname !== '/messages') return
  const list = document.querySelector('.message-list')
  if (!list || list.getAttribute('data-live') === '1') return
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return
  const { data, error } = await supabase.from('secure_messages').select('id,subject,body,read_at,created_at').eq('user_id', user.user.id).order('created_at', { ascending: false })
  if (error || !data) return
  list.setAttribute('data-live', '1')
  list.innerHTML = data.length ? data.map((message: any) => {
    const date = message.created_at ? new Date(message.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'Recent'
    return `<article><span class="message-icon">✉</span><div><b>FOXSYCU Secure Messages</b><strong>${esc(message.subject)}</strong><small>${date} · ${esc(message.body)}</small></div>${message.read_at ? '' : '<span class="unread"/>'}</article>`
  }).join('') : '<article><div><b>No secure messages</b><small>Your inbox is clear.</small></div></article>'
}

async function hydrateCardRequests() {
  if (location.pathname !== '/cards' || document.querySelector('[data-live-card-requests]')) return
  const anchor = document.querySelector('.cards-layout')
  if (!anchor) return
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return
  const { data, error } = await supabase.from('card_service_requests').select('id,request_type,status,created_at,updated_at').eq('user_id', user.user.id).order('created_at', { ascending: false }).limit(8)
  if (error || !data?.length) return
  const section = document.createElement('section')
  section.className = 'panel'
  section.setAttribute('data-live-card-requests', '1')
  section.innerHTML = `<div class="panel-head"><div><h2>Service requests</h2><p>Live card service history</p></div></div><div class="service-list">${data.map((r: any) => `<div class="service-row"><span><b>${esc(String(r.request_type).replaceAll('_', ' '))}</b><small>${r.created_at ? new Date(r.created_at).toLocaleString('en-US') : 'Recent'}</small></span><strong>${esc(r.status || 'open')}</strong></div>`).join('')}</div>`
  anchor.parentElement?.insertBefore(section, anchor.nextSibling)
}

async function persistSecuritySettings() {
  if (location.pathname !== '/settings') return
  const switches = [...document.querySelectorAll<HTMLButtonElement>('.switch')]
  if (switches.length < 2) return
  switches.forEach((button, index) => {
    if (button.getAttribute('data-security-live') === '1') return
    button.setAttribute('data-security-live', '1')
    button.addEventListener('click', async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const values = [...document.querySelectorAll<HTMLButtonElement>('.switch')]
      const payload: Record<string, boolean> = {
        two_fa: values[0]?.classList.contains('on') ?? false,
        alerts: values[1]?.classList.contains('on') ?? false,
      }
      await supabase.from('security_preferences').upsert({ user_id: user.user.id, ...payload })
      if (index === 2 && values[2]) localStorage.setItem('foxsycu.paperless', values[2].classList.contains('on') ? '1' : '0')
    })
  })
}

function run() {
  void hydrateMessages()
  void hydrateCardRequests()
  void persistSecuritySettings()
}

export function installLegacyYellowBridge() {
  if (typeof document === 'undefined' || installed) return
  installed = true
  run()
  const observer = new MutationObserver(() => {
    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(() => { timer = null; run() }, 100)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
