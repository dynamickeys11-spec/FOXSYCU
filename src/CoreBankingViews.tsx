import { useMemo, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronRight, MoveRight, Search, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import type { Transaction } from './types'
import './feature-banking.css'

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const signedAmount = (t: any) => Number(t.direction === 'DEBIT' ? -Number(t.amount) : Number(t.amount))

function Page({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="fb-page"><header className="fb-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>{children}</div>
}

function Card({ title, note, children, link }: { title: string; note?: string; children: React.ReactNode; link?: string }) {
  return <section className="fb-card"><div className="fb-card-head"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{link && <NavLink className="fb-link-btn" to={link}>View all <ChevronRight size={14}/></NavLink>}</div>{children}</section>
}

function TxRow({ t, onClick }: { t: any; onClick?: () => void }) {
  const amount = signedAmount(t)
  const positive = amount >= 0
  const row = <><span className="core-tx-icon">{positive ? <ArrowDownLeft size={15}/> : <ArrowUpRight size={15}/>}</span><span className="core-tx-copy"><b>{t.description || t.counterparty || 'Account activity'}</b><small>{t.counterparty || t.transaction_type || 'Transaction'} · {t.effective_date || t.date}</small></span><span className="core-tx-value"><strong>{positive ? '+' : ''}{money(amount)}</strong><small>{String(t.status || '').replace(/^./, (x: string) => x.toUpperCase())}</small></span><ChevronRight size={15}/></>
  return onClick ? <button className="core-tx-row" onClick={onClick}>{row}</button> : <div className="core-tx-row">{row}</div>
}

export function OverviewCenter() {
  const { profile, account, vaults, transactions } = useCustomerData()
  const available = Number(account?.available_balance ?? 0)
  const savings = vaults.reduce((sum, v) => sum + Number(v.balance || 0), 0)
  const pending = transactions.filter((t: any) => String(t.status).toLowerCase() === 'pending').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  return <BankingShell><Page eyebrow="OVERVIEW" title={`Good morning, ${(profile?.full_name || 'John Doe').split(' ')[0]}.`} description="Your USD banking relationship at a glance."><section className="core-hero"><div><span>AVAILABLE CHECKING BALANCE</span><strong>{money(available)}</strong><p>{account?.account_name || 'FOXSYCU Private Checking'} · •••• {account?.account_number_last4 || '4821'} · USD</p></div><div><span>TOTAL RELATIONSHIP</span><b>{money(available + savings)}</b><small>Checking + Savings</small></div></section><section className="core-actions"><NavLink to="/transfers"><MoveRight/><b>Transfer</b><small>Move money</small></NavLink><NavLink to="/transfers?mode=wire"><ArrowUpRight/><b>Wire</b><small>Send a wire</small></NavLink><NavLink to="/transfers?mode=deposit"><ArrowDownLeft/><b>Deposit</b><small>Add funds</small></NavLink><NavLink to="/cards"><Wallet/><b>Cards</b><small>Manage card</small></NavLink></section><div className="fb-grid"><Card title="Accounts" note="Balances across your relationship" link="/accounts"><div className="core-account"><Wallet/><div><b>{account?.account_name || 'FOXSYCU Private Checking'}</b><small>USD · •••• {account?.account_number_last4 || '4821'}</small></div><strong>{money(available)}</strong></div><div className="core-account"><Wallet/><div><b>Savings</b><small>{vaults.length} vaults · 4.50% APY</small></div><strong>{money(savings)}</strong></div></Card><Card title="Balance position" note="Current account status"><div className="fb-detail"><span>Available</span><b>{money(available)}</b></div><div className="fb-detail"><span>Pending</span><b>{money(pending)}</b></div><div className="fb-detail"><span>Account status</span><b>{account?.status || 'Active'}</b></div></Card></div><Card title="Recent activity" note="Latest account activity" link="/transactions"><div className="core-tx-list">{transactions.slice(0, 7).map(t => <TxRow key={t.id} t={t}/>)}</div></Card></Page></BankingShell>
}

export function AccountsCenter() {
  const { account, vaults, transactions } = useCustomerData()
  const available = Number(account?.available_balance ?? 0)
  const savings = vaults.reduce((sum, v) => sum + Number(v.balance || 0), 0)
  return <BankingShell><Page eyebrow="ACCOUNTS" title={account?.account_name || 'Private Checking'} description="Your primary USD account and relationship balances."><section className="core-hero"><div><span>AVAILABLE BALANCE</span><strong>{money(available)}</strong><p>•••• {account?.account_number_last4 || '4821'} · USD</p></div><div><span>STATUS</span><b>{account?.status || 'Active'}</b><small>Account in good standing</small></div></section><div className="fb-grid"><Card title="Account details" note="Identifiers and status"><div className="fb-detail"><span>Account type</span><b>Checking</b></div><div className="fb-detail"><span>Currency</span><b>United States Dollar (USD)</b></div><div className="fb-detail"><span>Account number</span><b>•••• {account?.account_number_last4 || '4821'}</b></div><div className="fb-detail"><span>Available</span><b>{money(available)}</b></div><div className="fb-detail"><span>Posted</span><b>{money(Number(account?.posted_balance ?? available))}</b></div></Card><Card title="Savings relationship" note={`${vaults.length} active savings vaults`}><div className="core-relationship"><strong>{money(savings)}</strong><span>Total savings</span></div>{vaults.map(v => <div className="fb-detail" key={v.id}><span>{v.name}</span><b>{money(Number(v.balance))}</b></div>)}</Card></div><Card title="Account activity" note="Posted and pending activity" link="/transactions"><div className="core-tx-list">{transactions.slice(0, 15).map(t => <TxRow key={t.id} t={t}/>)}</div></Card></Page></BankingShell>
}

export function TransactionsCenter() {
  const { transactions } = useCustomerData(); const [query, setQuery] = useState(''); const [selected, setSelected] = useState<Transaction | null>(null)
  const rows = useMemo(() => transactions.filter((t: any) => `${t.description || ''} ${t.counterparty || ''} ${t.reference || ''}`.toLowerCase().includes(query.toLowerCase())), [transactions, query])
  return <BankingShell><Page eyebrow="TRANSACTIONS" title="Activity" description="Search and review your account activity."><Card title="All activity" note={`${rows.length} transactions`}><div className="core-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, reference or description" aria-label="Search transactions"/></div><div className="core-tx-list">{rows.length ? rows.map(t => <TxRow key={t.id} t={t} onClick={() => setSelected(t)}/>) : <div className="fb-success"><CheckCircle2/><div><b>No matching transactions</b><p>Try a different search term.</p></div></div>}</div></Card>{selected && <div className="fb-modal" onClick={() => setSelected(null)}><div className="fb-dialog" onClick={e => e.stopPropagation()}><button className="fb-x" onClick={() => setSelected(null)} aria-label="Close details">×</button><span>TRANSACTION DETAILS</span><h2>{selected.description}</h2><div className="core-detail-amount">{signedAmount(selected) >= 0 ? '+' : ''}{money(signedAmount(selected))}</div><div className="fb-detail"><span>Status</span><b>{selected.status}</b></div><div className="fb-detail"><span>Reference</span><b>{selected.reference}</b></div><div className="fb-detail"><span>Counterparty</span><b>{selected.counterparty || '—'}</b></div><div className="fb-detail"><span>Date</span><b>{selected.date}</b></div></div></div>}</Page></BankingShell>
}
