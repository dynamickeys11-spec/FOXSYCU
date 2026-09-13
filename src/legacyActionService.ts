import { supabase } from './supabaseClient'

export type SupportTopic = 'transaction' | 'replace-card' | 'report-card' | 'general'

async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id || null
}

export async function setCardStatus(locked: boolean) {
  const userId = await currentUserId()
  if (!userId) throw new Error('You must be signed in.')
  const { data: account, error: accountError } = await supabase.from('accounts').select('id,account_number_last4').eq('user_id', userId).limit(1).maybeSingle()
  if (accountError || !account) throw new Error(accountError?.message || 'Checking account not found.')
  const { data: existing, error: readError } = await supabase.from('card_controls').select('id').eq('user_id', userId).eq('account_id', account.id).limit(1).maybeSingle()
  if (readError) throw new Error(readError.message)
  const values = { status: locked ? 'frozen' : 'active', updated_at: new Date().toISOString() }
  const result = existing
    ? await supabase.from('card_controls').update(values).eq('id', existing.id)
    : await supabase.from('card_controls').insert({ user_id: userId, account_id: account.id, last4: account.account_number_last4 || '4821', online_purchases: true, contactless: true, atm_withdrawals: true, digital_wallet: false, ...values })
  if (result.error) throw new Error(result.error.message)
  window.dispatchEvent(new CustomEvent('foxsycu-card-control-sync', { detail: { locked } }))
}

export async function createBeneficiary(name: string, accountLast4: string, type: string = 'domestic') {
  const userId = await currentUserId()
  if (!userId) throw new Error('You must be signed in.')
  const cleanName = name.trim()
  const cleanLast4 = accountLast4.replace(/\D/g, '').slice(-4)
  if (cleanName.length < 2) throw new Error('Enter the beneficiary name.')
  if (cleanLast4.length !== 4) throw new Error('Enter the last four digits of the destination account.')
  const { error } = await supabase.from('beneficiaries').insert({ user_id: userId, name: cleanName, account_masked: `••••${cleanLast4}`, beneficiary_type: type || 'domestic', status: 'active' })
  if (error) throw new Error(error.message)
  window.dispatchEvent(new CustomEvent('foxsycu-beneficiary-sync'))
}

export async function createSecureMessage(subject: string, body: string) {
  const userId = await currentUserId()
  if (!userId) throw new Error('You must be signed in.')
  const cleanSubject = subject.trim()
  const cleanBody = body.trim()
  if (!cleanSubject || !cleanBody) throw new Error('Subject and message are required.')
  const { error } = await supabase.from('secure_messages').insert({ user_id: userId, subject: cleanSubject, body: cleanBody })
  if (error) throw new Error(error.message)
  window.dispatchEvent(new CustomEvent('foxsycu-message-sync'))
}

export async function createSupportCase(topic: SupportTopic, detail?: string) {
  const userId = await currentUserId()
  if (!userId) throw new Error('You must be signed in.')
  const labels: Record<SupportTopic, string> = { transaction: 'Transaction issue', 'replace-card': 'Replace my card', 'report-card': 'Report a card issue', general: 'Customer support request' }
  const subject = detail?.trim() ? `${labels[topic]} — ${detail.trim()}` : labels[topic]
  if (topic === 'replace-card') {
    const { data: card, error: cardError } = await supabase.from('card_controls').select('id').eq('user_id', userId).limit(1).maybeSingle()
    if (cardError) throw new Error(cardError.message)
    const { data, error } = await supabase.from('card_service_requests').insert({ user_id: userId, card_control_id: card?.id || null, request_type: 'replacement', status: 'open' }).select('id').single()
    if (error) throw new Error(error.message)
    window.dispatchEvent(new CustomEvent('foxsycu-card-service-sync'))
    return `CARD-${String(data.id).slice(0, 8).toUpperCase()}`
  }
  if (topic === 'report-card') {
    const { data, error } = await supabase.from('card_disputes').insert({ user_id: userId, card_transaction_id: null, reason: subject, description: detail?.trim() || 'Customer reported a card issue.', status: 'open' }).select('id').single()
    if (error) throw new Error(error.message)
    window.dispatchEvent(new CustomEvent('foxsycu-card-dispute-sync'))
    return `DSP-${String(data.id).slice(0, 8).toUpperCase()}`
  }
  const stamp = new Date()
  const caseNumber = `FXS-${stamp.getUTCFullYear()}${String(stamp.getUTCMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const { error } = await supabase.from('support_cases').insert({ user_id: userId, case_number: caseNumber, subject, status: 'open', priority: 'normal' })
  if (error) throw new Error(error.message)
  window.dispatchEvent(new CustomEvent('foxsycu-support-sync'))
  return caseNumber
}

export async function updateSecurityPreference(field: 'two_fa' | 'alerts', value: boolean) {
  const userId = await currentUserId()
  if (!userId) throw new Error('You must be signed in.')
  const { error } = await supabase.from('security_preferences').upsert({ user_id: userId, [field]: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

export function showActionNotice(message: string) {
  const existing = document.getElementById('foxsycu-action-notice')
  existing?.remove()
  const node = document.createElement('div')
  node.id = 'foxsycu-action-notice'
  node.setAttribute('role', 'status')
  node.textContent = message
  Object.assign(node.style, { position: 'fixed', right: '22px', bottom: '22px', zIndex: '99999', maxWidth: '360px', padding: '14px 16px', borderRadius: '12px', background: '#101828', color: '#fff', boxShadow: '0 12px 36px rgba(0,0,0,.28)', font: '600 14px Inter,system-ui,sans-serif' })
  document.body.appendChild(node)
  window.setTimeout(() => node.remove(), 4200)
}
