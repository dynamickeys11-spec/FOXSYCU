import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { customer as seed } from './data/mockData'
import { buildTransactionUniverse } from './transactionEngine'
import type { Transaction } from './types'

type CustomerData = { loading: boolean; session: Session | null; profile: any | null; account: any | null; vaults: any[]; beneficiaries: any[]; transactions: Transaction[]; notifications: any[]; statements: any[]; card: any | null; security: { two_fa: boolean; passkey: boolean; alerts: boolean }; supportCases: any[]; messages: any[]; refresh: () => Promise<void> }
const CustomerContext = createContext<CustomerData | null>(null)
const universe = buildTransactionUniverse(seed.transactions)

function dbTransaction(t: Transaction, userId: string, accountId: string) { return { user_id: userId, account_id: accountId, reference: t.reference, transaction_type: t.type ?? 'TRANSFER', direction: t.amount >= 0 ? 'CREDIT' : 'DEBIT', amount: Math.abs(t.amount), fee: t.fee ?? 0, currency: t.currency, status: t.status.toLowerCase(), counterparty: t.counterparty, description: t.description, memo: t.memo, initiated_at: t.initiatedAt ?? new Date().toISOString(), effective_date: new Date(t.effectiveDate ?? t.date).toISOString().slice(0, 10), posted_at: t.postedAt ? new Date(t.postedAt).toISOString() : null, available_balance_after: t.availableBalanceAfter, posted_balance_after: t.postedBalanceAfter, metadata: t.metadata ?? {} } }

async function ensureCustomer(userId: string) {
  const existing = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (!existing.data) { await supabase.from('profiles').upsert({ id: userId, full_name: 'John Doe', tier: 'Premium User', currency: 'USD', customer_since: '2021-03-18' }); await supabase.from('audit_logs').insert({ user_id: userId, action: 'customer_profile_created', resource_type: 'profile', resource_id: userId, metadata: { synthetic: true } }) }
  let { data: account } = await supabase.from('accounts').select('*').eq('user_id', userId).eq('account_type', 'checking').maybeSingle()
  if (!account) { const created = await supabase.from('accounts').insert({ user_id: userId, account_type: 'checking', account_name: 'FOXSYCU Private Checking', currency: 'USD', account_number_last4: '4821', status: 'active', available_balance: 5000000, posted_balance: 5000000, pending_balance: 25000 }).select('*').single(); if (created.error) throw created.error; account = created.data }
  const { count: vaultCount } = await supabase.from('savings_vaults').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (!vaultCount) await supabase.from('savings_vaults').insert([{ user_id: userId, name: 'Emergency Reserve', balance: 250000, target_amount: 300000, apy: 4.5, status: 'active' }, { user_id: userId, name: 'Property Reserve', balance: 250000, target_amount: 500000, apy: 4.5, status: 'active' }, { user_id: userId, name: 'Travel & Lifestyle', balance: 125000, target_amount: 200000, apy: 4.5, status: 'active' }])
  const { count: beneficiaryCount } = await supabase.from('beneficiaries').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (!beneficiaryCount) await supabase.from('beneficiaries').insert([{ user_id: userId, name: 'Alex Smith', account_masked: '••••1920', beneficiary_type: 'individual', status: 'active' }, { user_id: userId, name: 'Maria Johnson', account_masked: '••••4472', beneficiary_type: 'individual', status: 'active' }, { user_id: userId, name: 'Northstar Holdings', account_masked: '••••8104', beneficiary_type: 'business', status: 'active' }])
  const { count: transactionCount } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (!transactionCount) for (let i = 0; i < universe.length; i += 100) { const result = await supabase.from('transactions').insert(universe.slice(i, i + 100).map(t => dbTransaction(t, userId, account!.id))); if (result.error) throw result.error }
  const { count: notificationCount } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (!notificationCount) await supabase.from('notifications').insert([{ user_id: userId, title: 'Transfer alert', body: 'A $25,000 savings transfer is pending authorization.', notification_type: 'transaction' }, { user_id: userId, title: 'Security alert', body: 'Your recommended security controls are active.', notification_type: 'security' }])
  await supabase.from('security_preferences').upsert({ user_id: userId })
  await supabase.from('card_controls').upsert({ user_id: userId, account_id: account!.id, last4: '4821' }, { onConflict: 'user_id,account_id' })
  const { count: supportCount } = await supabase.from('support_cases').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (!supportCount) await supabase.from('support_cases').insert([{ user_id: userId, case_number: 'FX-2026-0184', subject: 'Account relationship review', status: 'open', priority: 'priority' }, { user_id: userId, case_number: 'FX-2026-0141', subject: 'Statement request', status: 'resolved', priority: 'normal' }])
  const { count: messageCount } = await supabase.from('secure_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (!messageCount) await supabase.from('secure_messages').insert([{ user_id: userId, subject: 'Relationship team · Quarterly review', body: 'Your September relationship summary is ready.' }, { user_id: userId, subject: 'Security · Device confirmation', body: 'Your trusted-device list was updated.' }])
}

function syncDashboardLedger(rows: any[]) {
  const normalized = rows.map(row => ({ id: row.id, reference: row.reference, type: row.transaction_type, status: row.status === 'completed' ? 'Completed' : row.status === 'pending' ? 'Pending' : row.status === 'failed' ? 'Failed' : 'Reversed', amount: row.direction === 'DEBIT' ? -Number(row.amount) : Number(row.amount), currency: row.currency, direction: row.direction, description: row.description, date: row.effective_date, time: new Date(row.posted_at ?? row.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), counterparty: row.counterparty, memo: row.memo, fee: Number(row.fee ?? 0), effectiveDate: row.effective_date, postedBalanceAfter: row.posted_balance_after, availableBalanceAfter: row.available_balance_after, metadata: row.metadata ?? {} }))
  try { localStorage.setItem('foxsycu.transaction-universe.v2', JSON.stringify(normalized)); localStorage.setItem('foxsycu.transactions', JSON.stringify(normalized)); window.dispatchEvent(new CustomEvent('foxsycu-customer-sync')) } catch {}
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Omit<CustomerData, 'loading' | 'session' | 'refresh'>>({ profile: null, account: null, vaults: [], beneficiaries: [], transactions: [], notifications: [], statements: [], card: null, security: { two_fa: true, passkey: true, alerts: true }, supportCases: [], messages: [] })
  const refresh = async () => {
    if (!session?.user) return
    await ensureCustomer(session.user.id); const uid = session.user.id
    const [profile, account, vaults, beneficiaries, transactions, notifications, card, security, statements, supportCases, messages] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(), supabase.from('accounts').select('*').eq('user_id', uid).eq('account_type', 'checking').maybeSingle(), supabase.from('savings_vaults').select('*').eq('user_id', uid).order('created_at'), supabase.from('beneficiaries').select('*').eq('user_id', uid).order('created_at'), supabase.from('transactions').select('*').eq('user_id', uid).order('effective_date', { ascending: false }).order('created_at', { ascending: false }), supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }), supabase.from('card_controls').select('*').eq('user_id', uid).maybeSingle(), supabase.from('security_preferences').select('two_fa,passkey,alerts').eq('user_id', uid).maybeSingle(), supabase.from('statements').select('*').eq('user_id', uid).order('statement_month', { ascending: false }), supabase.from('support_cases').select('*').eq('user_id', uid).order('created_at', { ascending: false }), supabase.from('secure_messages').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ])
    syncDashboardLedger(transactions.data ?? [])
    setData({ profile: profile.data, account: account.data, vaults: vaults.data ?? [], beneficiaries: beneficiaries.data ?? [], transactions: (transactions.data ?? []) as unknown as Transaction[], notifications: notifications.data ?? [], card: card.data, security: security.data ?? { two_fa: true, passkey: true, alerts: true }, statements: statements.data ?? [], supportCases: supportCases.data ?? [], messages: messages.data ?? [] })
  }
  useEffect(() => { let active = true; void supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false) } }); const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false) }); return () => { active = false; listener.subscription.unsubscribe() } }, [])
  useEffect(() => { if (session) void refresh() }, [session])
  const value = useMemo(() => ({ ...data, loading, session, refresh }), [data, loading, session])
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}
export function useCustomerData() { const value = useContext(CustomerContext); if (!value) throw new Error('useCustomerData must be used inside CustomerProvider'); return value }
