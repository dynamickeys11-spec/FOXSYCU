import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { customer as seed } from './data/mockData'
import { buildTransactionUniverse } from './transactionEngine'
import { CANONICAL_ACCOUNT, CANONICAL_BENEFICIARIES, CANONICAL_VAULTS, makeAccountName } from './data/canonicalBanking'
import type { Transaction } from './types'

type CustomerData = {
  loading: boolean; session: Session | null; profile: any | null; account: any | null; vaults: any[]; beneficiaries: any[]; transactions: Transaction[]; notifications: any[]; card: any | null;
  security: { two_fa: boolean; passkey: boolean; alerts: boolean }; notificationPreferences: any | null; supportCases: any[]; messages: any[];
  externalAccounts: any[]; categories: any[]; budgets: any[]; recurringPayments: any[]; billPayees: any[]; billPayments: any[]; directDeposit: any[]; checkDeposits: any[]; loginEvents: any[]; devices: any[];
  refresh: () => Promise<void>
}

const CustomerContext = createContext<CustomerData | null>(null)
const universe = buildTransactionUniverse(seed.transactions)
const caseNumber = (prefix: string, index: number) => `FX-${new Date().getFullYear()}-${prefix}${String(index).padStart(3, '0')}`

function dbTransaction(t: Transaction, userId: string, accountId: string) {
  const reference = `${t.reference}-${userId.slice(0, 8)}`
  return { user_id: userId, account_id: accountId, reference, transaction_type: t.type ?? 'TRANSFER', direction: t.amount >= 0 ? 'credit' : 'debit', amount: Math.abs(t.amount), fee: t.fee ?? 0, currency: t.currency, status: t.status.toLowerCase(), counterparty: t.counterparty, description: t.description, memo: t.memo, initiated_at: t.initiatedAt ?? new Date().toISOString(), effective_date: new Date(t.effectiveDate ?? t.date).toISOString().slice(0, 10), posted_at: t.postedAt ? new Date(t.postedAt).toISOString() : null, available_balance_after: t.availableBalanceAfter, posted_balance_after: t.postedBalanceAfter, metadata: { ...(t.metadata ?? {}), synthetic: true } }
}

async function ensureCustomer(userId: string) {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user
  const meta = user?.user_metadata ?? {}
  const profilePayload = {
    full_name: String(meta.full_name || meta.name || user?.email?.split('@')[0] || 'Customer').trim(),
    preferred_name: meta.preferred_name || null,
    phone: meta.phone || null,
    date_of_birth: meta.date_of_birth || null,
    address_line1: meta.address_line1 || null,
    city: meta.city || null,
    state_region: meta.state_region || null,
    postal_code: meta.postal_code || null,
    country: meta.country || 'United States',
    occupation: meta.occupation || null,
    employment_status: meta.employment_status || null,
  }
  const existingProfile = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (existingProfile.error) throw existingProfile.error
  if (!existingProfile.data) {
    const created = await supabase.from('profiles').upsert({ id: userId, ...profilePayload, tier: 'Customer', currency: 'USD', customer_since: new Date().toISOString().slice(0, 10), profile_completed: Boolean(profilePayload.full_name && profilePayload.address_line1 && profilePayload.city) }, { onConflict: 'id' }).select('*').single()
    if (created.error) throw created.error
    await supabase.from('audit_logs').insert({ user_id: userId, action: 'customer_profile_created', resource_type: 'profile', resource_id: userId, metadata: { synthetic: true } })
  } else {
    const current = existingProfile.data
    const merge: Record<string, any> = { id: userId }
    const keys = ['full_name','preferred_name','phone','date_of_birth','address_line1','city','state_region','postal_code','country','occupation','employment_status'] as const
    for (const key of keys) {
      const currentValue = current[key]
      const incomingValue = profilePayload[key]
      if ((currentValue === null || currentValue === undefined || String(currentValue).trim() === '') && incomingValue !== null && incomingValue !== undefined && String(incomingValue).trim() !== '') merge[key] = incomingValue
    }
    if (Object.keys(merge).length > 1) {
      const merged = await supabase.from('profiles').upsert(merge, { onConflict: 'id' }).select('*').single()
      if (merged.error) throw merged.error
    }
  }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  const ownerName = String(profile?.preferred_name || profile?.full_name || profilePayload.preferred_name || profilePayload.full_name || user?.email?.split('@')[0] || 'Customer').trim()
  const accountName = makeAccountName(ownerName)
  let { data: account } = await supabase.from('accounts').select('*').eq('user_id', userId).eq('account_type', 'checking').maybeSingle()
  if (!account) { const created = await supabase.from('accounts').insert({ user_id: userId, account_type: CANONICAL_ACCOUNT.accountType, account_name: accountName, currency: CANONICAL_ACCOUNT.currency, account_number_last4: CANONICAL_ACCOUNT.last4, status: 'active', available_balance: CANONICAL_ACCOUNT.targetBalance, posted_balance: CANONICAL_ACCOUNT.targetBalance, pending_balance: CANONICAL_ACCOUNT.pendingAmount }).select('*').single(); if (created.error) throw created.error; account = created.data }
  else if (account.account_name === 'FOXSYCU Private Checking' || !String(account.account_name || '').trim()) { const renamed = await supabase.rpc('rename_own_account', { p_account_id: account.id, p_account_name: accountName }); if (renamed.error) throw renamed.error; account = renamed.data }
  const existingVaults = await supabase.from('savings_vaults').select('*').eq('user_id', userId).order('created_at'); if (!existingVaults.data?.length) { const result = await supabase.from('savings_vaults').insert(CANONICAL_VAULTS.map(v => ({ user_id: userId, name: v.name, balance: v.balance, target_amount: v.target, apy: v.apy, status: 'active' }))); if (result.error) throw result.error }
  const { count: beneficiaryCount } = await supabase.from('beneficiaries').select('id', { count: 'exact', head: true }).eq('user_id', userId); if (!beneficiaryCount) { const result = await supabase.from('beneficiaries').insert(CANONICAL_BENEFICIARIES.map(b => ({ user_id: userId, name: b.name, account_masked: b.accountMasked, beneficiary_type: b.type, status: 'active' }))); if (result.error) throw result.error }
  const { count: transactionCount } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if ((transactionCount ?? 0) < universe.length) {
    if (!transactionCount) {
      const restored = await supabase.rpc('restore_canonical_account', { p_account_id: account!.id })
      if (restored.error) throw restored.error
      account = restored.data
    }
    for (let i = 0; i < universe.length; i += 100) {
      const result = await supabase.from('transactions').upsert(universe.slice(i, i + 100).map(t => dbTransaction(t, userId, account!.id)), { onConflict: 'reference', ignoreDuplicates: true })
      if (result.error) throw result.error
    }
  }
  const { count: notificationCount } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId); if (!notificationCount) { const result = await supabase.from('notifications').insert([{ user_id: userId, title: 'Transfer alert', body: 'A savings transfer is pending authorization.', notification_type: 'transaction' }, { user_id: userId, title: 'Security alert', body: 'Your recommended security controls are active.', notification_type: 'security' }]); if (result.error) throw result.error }
  const { data: security } = await supabase.from('security_preferences').select('user_id').eq('user_id', userId).maybeSingle(); if (!security) { const result = await supabase.from('security_preferences').insert({ user_id: userId, two_fa: true, passkey: false, alerts: true }); if (result.error) throw result.error }
  const { data: card } = await supabase.from('card_controls').select('id').eq('user_id', userId).eq('account_id', account!.id).maybeSingle(); if (!card) { const result = await supabase.from('card_controls').insert({ user_id: userId, account_id: account!.id, last4: CANONICAL_ACCOUNT.last4 }); if (result.error) throw result.error }
  const { count: supportCount } = await supabase.from('support_cases').select('id', { count: 'exact', head: true }).eq('user_id', userId); if (!supportCount) { const result = await supabase.from('support_cases').insert([{ user_id: userId, case_number: caseNumber('AR', 1), subject: 'Account relationship review', status: 'open', priority: 'priority' }]); if (result.error) throw result.error }
  const { count: messageCount } = await supabase.from('secure_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId); if (!messageCount) { const result = await supabase.from('secure_messages').insert([{ user_id: userId, subject: 'Relationship team · Quarterly review', body: 'Your latest relationship summary is ready.' }, { user_id: userId, subject: 'Security · Device confirmation', body: 'Your trusted-device list was updated.' }]); if (result.error) throw result.error }
  const pref = await supabase.from('notification_preferences').select('user_id').eq('user_id', userId).maybeSingle(); if (!pref.data) { const result = await supabase.from('notification_preferences').insert({ user_id: userId }); if (result.error) throw result.error }
}

function toTransaction(row: any): Transaction { return { id: row.id, reference: row.reference, type: row.transaction_type, status: row.status === 'completed' ? 'Completed' : row.status === 'pending' ? 'Pending' : row.status === 'failed' ? 'Failed' : 'Reversed', amount: row.direction === 'debit' ? -Number(row.amount) : Number(row.amount), currency: row.currency, direction: row.direction, description: row.description, date: row.effective_date, time: new Date(row.posted_at ?? row.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), counterparty: row.counterparty, memo: row.memo, fee: Number(row.fee ?? 0), effectiveDate: row.effective_date, postedBalanceAfter: row.posted_balance_after, availableBalanceAfter: row.available_balance_after, accountId: row.account_id, metadata: row.metadata ?? {} } as Transaction }

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true); const [data, setData] = useState<Omit<CustomerData, 'loading' | 'session' | 'refresh'>>({ profile: null, account: null, vaults: [], beneficiaries: [], transactions: [], notifications: [], card: null, security: { two_fa: true, passkey: false, alerts: true }, notificationPreferences: null, supportCases: [], messages: [], externalAccounts: [], categories: [], budgets: [], recurringPayments: [], billPayees: [], billPayments: [], directDeposit: [], checkDeposits: [], loginEvents: [], devices: [] })
  const refresh = async () => { if (!session?.user) return; const uid = session.user.id; try { await ensureCustomer(uid) } catch (error) { console.error('FOXSYCU customer bootstrap warning:', error) } const [profile, account, vaults, beneficiaries, transactions, notifications, card, security, supportCases, messages, notificationPreferences, externalAccounts, categories, budgets, recurringPayments, billPayees, billPayments, directDeposit, checkDeposits, loginEvents, devices] = await Promise.all([supabase.from('profiles').select('*').eq('id', uid).maybeSingle(), supabase.from('accounts').select('*').eq('user_id', uid).order('created_at').maybeSingle(), supabase.from('savings_vaults').select('*').eq('user_id', uid).order('created_at'), supabase.from('beneficiaries').select('*').eq('user_id', uid).order('created_at'), supabase.from('transactions').select('*').eq('user_id', uid).order('effective_date', { ascending: false }).order('created_at', { ascending: false }), supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }), supabase.from('card_controls').select('*').eq('user_id', uid).maybeSingle(), supabase.from('security_preferences').select('two_fa,passkey,alerts').eq('user_id', uid).maybeSingle(), supabase.from('support_cases').select('*').eq('user_id', uid).order('created_at', { ascending: false }), supabase.from('secure_messages').select('*').eq('user_id', uid).order('created_at', { ascending: false }), supabase.from('notification_preferences').select('*').eq('user_id', uid).maybeSingle(), supabase.from('external_accounts').select('*').eq('user_id', uid).eq('status', 'active').order('created_at', { ascending: false }), supabase.from('transaction_categories').select('*').eq('user_id', uid), supabase.from('budgets').select('*').eq('user_id', uid).order('created_at', { ascending: false }), supabase.from('recurring_payments').select('*').eq('user_id', uid).order('next_run_at'), supabase.from('bill_payees').select('*').eq('user_id', uid).order('created_at'), supabase.from('bill_payments').select('*').eq('user_id', uid).order('scheduled_for'), supabase.from('direct_deposit_profiles').select('*').eq('user_id', uid), supabase.from('check_deposits').select('*').eq('user_id', uid).order('created_at', { ascending: false }), supabase.from('login_events').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20), supabase.from('user_devices').select('*').eq('user_id', uid).order('last_seen_at', { ascending: false })]); setData({ profile: profile.data, account: account.data, vaults: vaults.data ?? [], beneficiaries: beneficiaries.data ?? [], transactions: (transactions.data ?? []).map(toTransaction), notifications: notifications.data ?? [], card: card.data, security: security.data ?? { two_fa: true, passkey: false, alerts: true }, notificationPreferences: notificationPreferences.data, supportCases: supportCases.data ?? [], messages: messages.data ?? [], externalAccounts: externalAccounts.data ?? [], categories: categories.data ?? [], budgets: budgets.data ?? [], recurringPayments: recurringPayments.data ?? [], billPayees: billPayees.data ?? [], billPayments: billPayments.data ?? [], directDeposit: directDeposit.data ?? [], checkDeposits: checkDeposits.data ?? [], loginEvents: loginEvents.data ?? [], devices: devices.data ?? [] }) }
  useEffect(() => { let active = true; void supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false) } }); const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false) }); return () => { active = false; listener.subscription.unsubscribe() } }, [])
  useEffect(() => { if (session) void refresh() }, [session])
  useEffect(() => { if (!session?.user) return; const uid = session.user.id; let timer: ReturnType<typeof setTimeout> | undefined; let refreshing = false; const queueRefresh = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { if (refreshing) return; refreshing = true; void refresh().finally(() => { refreshing = false }) }, 120) }; const tables = ['profiles','accounts','transactions','savings_vaults','beneficiaries','notifications','card_controls','security_preferences','support_cases','secure_messages','notification_preferences','external_accounts','transaction_categories','budgets','recurring_payments','bill_payees','bill_payments','direct_deposit_profiles','check_deposits','login_events','user_devices']; let channel = supabase.channel(`foxsycu-customer-${uid}`); tables.forEach(table => { channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${uid}` }, queueRefresh) }); channel.subscribe(); return () => { if (timer) clearTimeout(timer); void supabase.removeChannel(channel) } }, [session?.user?.id])
  const value = useMemo(() => ({ ...data, loading, session, refresh }), [data, loading, session]); return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}
export function useCustomerData() { const value = useContext(CustomerContext); if (!value) throw new Error('useCustomerData must be used inside CustomerProvider'); return value }
