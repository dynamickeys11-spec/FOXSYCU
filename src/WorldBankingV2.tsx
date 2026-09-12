import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Activity, ArrowDownLeft, ArrowUpRight, Bell, ChevronRight, CreditCard, FileText, Home, Menu, MoveRight, PiggyBank, Search, Settings, ShieldCheck, Users, Wallet, X } from 'lucide-react'
import { customer as seed } from './data/mockData'
import type { Transaction } from './types'
import { addTransaction } from './ledgerStore'
import './world-v2.css'

const ACCOUNT = '•••• 4821'
const SAVINGS = '•••• 7814'
const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const nav = [
  ['Overview', '/', Home],
  ['Accounts', '/accounts', Wallet],
  ['Transfers & Payments', '/transfers', MoveRight],
  ['Beneficiaries', '/beneficiaries', Users],
  ['Transactions', '/transactions', Activity],
  ['Savings', '/savings', PiggyBank],
  ['Cards', '/cards', CreditCard],
  ['Statements & Documents', '/statements', FileText],
  ['Security Center', '/settings', ShieldCheck],
  ['Settings', '/settings', Settings],
] as const

function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem('foxsycu.transactions')
    return raw ? JSON.parse(raw) : seed.transactions
  } catch {
    return seed.transactions
  }
}

function Header({ title, eyebrow, description, action }: { title: string; eyebrow: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const transactions = getTransactions()
  const matches = useMemo(() => transactions.filter(t => `${t.description} ${t.counterparty ?? ''} ${t.reference}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5), [transactions, query])

  return (
    <div className="bank-app">
      <aside className={`bank-sidebar ${open ? 'show' : ''}`}>
        <div className="bank-logo">
          <div className="logo-mark">F</div>
          <div><b>FOXSYCU</b><small>DIGITAL BANKING SYSTEM</small></div>
          <button className="side-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="customer-chip"><span>JD</span><div><b>John Doe</b><small>Premium · USD</small></div></div>
        <div className="nav-label">BANKING</div>
        <nav>
          {nav.map(([label, path, Icon]) => (
            <NavLink key={label} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `bank-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="security-foot"><ShieldCheck size={16} /><div><b>Protected</b><small>Security center</small></div></div>
      </aside>

      <div className="bank-body">
        <header className="bank-header">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="header-title">PERSONAL BANKING</div>
          <div className="header-actions">
            <div className="global-search">
              <Search size={16} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search activity" />
              {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}
              {query && <div className="search-results">{matches.length ? matches.map(t => <NavLink key={t.id} to="/transactions" onClick={() => setQuery('')}><b>{t.description}</b><strong>{money(t.amount)}</strong><small>{t.date} · {t.reference}</small></NavLink>) : <span>No matching activity</span>}</div>}
            </div>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <NavLink to="/settings" className="profile"><span>JD</span><div><b>John Doe</b><small>Premium User</small></div></NavLink>
          </div>
        </header>
        <main className="bank-content">{children}</main>
      </div>

      <nav className="mobile-nav">
        {([['Home', '/', Home], ['Savings', '/savings', PiggyBank], ['Activity', '/transactions', Activity], ['Move', '/transfers', MoveRight], ['Profile', '/settings', Settings]] as const).map(([label, path, Icon]) => (
          <NavLink key={label} to={path} end={path === '/'}><Icon size={18} /><span>{label}</span></NavLink>
        ))}
      </nav>
    </div>
  )
}

function Card({ title, note, children, link }: { title: string; note: string; children: React.ReactNode; link?: string }) {
  return <section className="bank-card"><div className="card-title"><div><h2>{title}</h2><p>{note}</p></div>{link && <NavLink to={link}>View all <ChevronRight size={14} /></NavLink>}</div>{children}</section>
}

function TransactionRow({ t, onClick }: { t: Transaction; onClick?: () => void }) {
  return <button className="transaction-row" onClick={onClick}><span className={`transaction-icon ${t.amount >= 0 ? 'credit' : 'debit'}`}>{t.amount >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span><span className="transaction-copy"><b>{t.description}</b><small>{t.counterparty || t.category || t.kind} · {t.date}</small></span><span className="transaction-value"><strong className={t.amount >= 0 ? 'positive' : ''}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</strong><small>{t.status}</small></span><ChevronRight size={15} /></button>
}

function Dashboard() {
  const transactions = getTransactions()
  const balance = transactions.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.amount, 125000)
  const pending = transactions.filter(t => t.status === 'Pending').reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const total = balance + seed.savingsBalance

  return <>
    <Header eyebrow="OVERVIEW" title="Good morning, John." description="Your USD banking relationship at a glance." action={<NavLink className="primary-btn" to="/transfers"><MoveRight size={16} />Move money</NavLink>} />
    <section className="balance-hero"><div><span>AVAILABLE CHECKING BALANCE</span><strong>{money(balance)}</strong><p>Private Checking {ACCOUNT} · USD</p></div><div className="relationship-total"><span>TOTAL RELATIONSHIP</span><b>{money(total)}</b><small>Checking + Savings</small></div></section>
    <section className="action-strip"><NavLink to="/transfers?mode=transfer"><MoveRight /><b>Transfer</b><small>Move money</small></NavLink><NavLink to="/transfers?mode=wire"><ArrowUpRight /><b>Wire</b><small>Send a wire</small></NavLink><NavLink to="/transfers?mode=zelle"><Users /><b>Zelle</b><small>Send money</small></NavLink><NavLink to="/transfers?mode=deposit"><ArrowDownLeft /><b>Deposit</b><small>Add funds</small></NavLink></section>
    <div className="two-column"><Card title="Accounts" note="Balances across your relationship" link="/accounts"><div className="account-line"><span className="account-icon"><Wallet /></span><span><b>Private Checking</b><small>USD · {ACCOUNT}</small></span><strong>{money(balance)}</strong></div><div className="account-line"><span className="account-icon"><PiggyBank /></span><span><b>Savings</b><small>3 vaults · {seed.apy.toFixed(2)}% APY · {SAVINGS}</small></span><strong>{money(seed.savingsBalance)}</strong></div></Card><Card title="Balance position" note="Current account status"><div className="metric"><span>Available</span><b>{money(balance)}</b></div><div className="metric"><span>Pending</span><b>{money(pending)}</b></div><div className="metric"><span>Relationship</span><b>{money(total)}</b></div></Card></div>
    <Card title="Recent activity" note="Latest account activity" link="/transactions">{transactions.slice(0, 7).map(t => <TransactionRow key={t.id} t={t} />)}</Card>
  </>
}

function Accounts() {
  const transactions = getTransactions()
  const balance = transactions.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.amount, 125000)
  return <><Header eyebrow="ACCOUNTS" title="Private Checking" description="Primary USD account · active since March 18, 2021" action={<NavLink className="primary-btn" to="/transfers">Transfer</NavLink>} /><section className="account-banner"><span>AVAILABLE BALANCE</span><strong>{money(balance)}</strong><p>Private Checking {ACCOUNT}</p></section><Card title="Account details" note="Account identifiers and status"><div className="detail-line"><span>Account type</span><b>Private checking</b></div><div className="detail-line"><span>Currency</span><b>United States Dollar (USD)</b></div><div className="detail-line"><span>Account number</span><b>{ACCOUNT}</b></div><div className="detail-line"><span>Opened</span><b>{seed.accountOpened}</b></div><div className="detail-line"><span>Status</span><b className="positive">Active</b></div></Card><Card title="Account activity" note="Posted and pending transactions" link="/transactions">{transactions.slice(0, 15).map(t => <TransactionRow key={t.id} t={t} />)}</Card></>
}

function Transfers() {
  const navigate = useNavigate()
  const initial = new URLSearchParams(useLocation().search).get('mode') || 'transfer'
  const [mode, setMode] = useState(initial)
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState(seed.beneficiaries[0]?.name || 'Alex Smith')
  const [review, setReview] = useState(false)
  const [done, setDone] = useState<Transaction | null>(null)
  const transactions = getTransactions()
  const balance = transactions.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.amount, 125000)
  const value = Number(amount) || 0
  const fee = mode === 'wire' ? 15 : 0

  const confirm = () => {
    if (!value || value + fee > balance) return
    const now = new Date()
    const ref = `FX-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const transaction: Transaction = { id: ref, kind: 'Transfer', description: mode === 'zelle' ? `Zelle payment to ${recipient}` : mode === 'wire' ? `Domestic wire to ${recipient}` : `Transfer to ${recipient}`, date: now.toISOString().slice(0, 10), time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), amount: -(value + fee), currency: 'USD', status: 'Completed', reference: ref, category: mode === 'zelle' ? 'Zelle' : mode === 'wire' ? 'Domestic wire' : 'ACH transfer', counterparty: recipient }
    addTransaction(transaction)
    setDone(transaction)
    setReview(false)
  }

  if (done) return <><Header eyebrow="TRANSFER CONFIRMED" title="Transfer completed" description="The transaction has been posted to your account." /><section className="receipt"><div className="success-mark">✓</div><span>COMPLETED</span><strong>{money(Math.abs(done.amount))}</strong><p>{done.description}</p><div className="receipt-grid"><div><span>Reference</span><b>{done.reference}</b></div><div><span>Recipient</span><b>{recipient}</b></div><div><span>New available balance</span><b>{money(balance + done.amount)}</b></div></div><div className="receipt-actions"><button className="secondary-btn" onClick={() => setDone(null)}>Make another</button><button className="primary-btn" onClick={() => navigate('/transactions')}>View activity</button></div></section></>

  return <><Header eyebrow="MOVE MONEY" title="Transfers & payments" description="Choose a payment rail and review every detail before authorization." /><div className="rail-tabs">{[['transfer', 'Transfer'], ['wire', 'Wire'], ['zelle', 'Zelle'], ['deposit', 'Deposit']].map(([id, label]) => <button key={id} className={mode === id ? 'active' : ''} onClick={() => setMode(id)}>{label}</button>)}</div><div className="transfer-grid"><Card title={mode === 'wire' ? 'Domestic wire' : mode === 'zelle' ? 'Send with Zelle' : mode === 'deposit' ? 'Deposit funds' : 'Transfer money'} note="Secure transaction authorization"><label className="field">Recipient<select value={recipient} onChange={e => setRecipient(e.target.value)}>{seed.beneficiaries.map(b => <option key={b.id}>{b.name}</option>)}</select></label><label className="field">Amount<input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" inputMode="decimal" /></label><div className="secure-note"><ShieldCheck size={16} />Available balance {money(balance)}</div><button className="primary-btn full" disabled={!value || value + fee > balance} onClick={() => setReview(true)}>Review & authorize</button></Card><aside className="bank-card transfer-summary"><span>TRANSACTION SUMMARY</span><div><small>From</small><b>Private Checking {ACCOUNT}</b></div><div><small>Recipient</small><b>{recipient}</b></div><div><small>Amount</small><b>{money(value)}</b></div><div><small>Fee</small><b>{money(fee)}</b></div><div className="summary-total"><span>Total debit</span><strong>{money(value + fee)}</strong></div></aside></div>{review && <div className="modal"><section className="confirm"><button className="close" onClick={() => setReview(false)}><X size={18} /></button><span>REVIEW & AUTHORIZE</span><h2>Confirm transaction</h2><strong>{money(value + fee)}</strong><p>{mode === 'zelle' ? 'Zelle payment' : mode === 'wire' ? 'Domestic wire' : 'Transfer'} · {recipient}</p><div className="modal-actions"><button className="secondary-btn" onClick={() => setReview(false)}>Cancel</button><button className="primary-btn" onClick={confirm}>Confirm transfer</button></div></section></div>}</>
}

function Transactions() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Transaction | null>(null)
  const transactions = getTransactions().filter(t => `${t.description} ${t.counterparty ?? ''} ${t.reference}`.toLowerCase().includes(query.toLowerCase()))
  return <><Header eyebrow="TRANSACTIONS" title="Activity" description="Search and review your account activity." /><div className="transaction-toolbar"><div><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or reference" /></div></div><Card title="All activity" note={`${transactions.length} transactions`}>{transactions.map(t => <TransactionRow key={t.id} t={t} onClick={() => setSelected(t)} />)}</Card>{selected && <div className="drawer-back" onClick={() => setSelected(null)}><aside className="transaction-drawer" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}><X size={18} /></button><span>TRANSACTION DETAILS</span><h2>{selected.description}</h2><strong className={selected.amount >= 0 ? 'positive' : ''}>{selected.amount >= 0 ? '+' : ''}{money(selected.amount)}</strong><p>{selected.status}</p><div className="drawer-line"><span>Date</span><b>{selected.date} · {selected.time}</b></div><div className="drawer-line"><span>Reference</span><b>{selected.reference}</b></div><div className="drawer-line"><span>Counterparty</span><b>{selected.counterparty || '—'}</b></div></aside></div>}</>
}

function Savings() { return <><Header eyebrow="SAVE" title="Savings" description="Three USD savings vaults earning interest." /><div className="vault-grid">{seed.savingsVaults.map(v => <article className="bank-card vault" key={v.id}><span>{v.name.toUpperCase()}</span><h2>{money(v.balance)}</h2><p>Target {money(v.target)}</p><div className="progress"><i style={{ width: `${Math.min(100, (v.balance / v.target) * 100)}%` }} /></div><small>{money(v.interestEarned || 0)} interest earned</small></article>)}</div></> }
function Cards() { return <><Header eyebrow="CARDS" title="Cards" description="Manage your FOXSYCU payment card." /><div className="card-layout"><div className="debit-card"><span>FOXSYCU</span><small>PRIVATE DEBIT</small><strong>•••• 4821</strong><b>JOHN DOE</b></div><Card title="Card controls" note="Current controls"><div className="control-line"><span>Card status</span><b>Active</b></div><div className="control-line"><span>Online purchases</span><b>On</b></div><div className="control-line"><span>International</span><b>On</b></div><div className="control-line"><span>ATM withdrawals</span><b>On</b></div></Card></div></> }
function Statements() { return <><Header eyebrow="DOCUMENTS" title="Statements & documents" description="Monthly statements for your USD accounts." /><Card title="2026 statements" note={`Private Checking ${ACCOUNT}`} >{['August 2026', 'July 2026', 'June 2026', 'May 2026', 'April 2026', 'March 2026'].map(month => <div className="statement-line" key={month}><FileText size={17} /><div><b>{month} statement</b><small>Private Checking · PDF</small></div><button>View</button></div>)}</Card></> }
function Simple({ title, eyebrow, description }: { title: string; eyebrow: string; description: string }) { return <><Header eyebrow={eyebrow} title={title} description={description} /><Card title={title} note="Account service"><div className="empty"><ShieldCheck size={28} /><h2>Protected service</h2><p>This area is ready for its operational workflow.</p></div></Card></> }

export default function WorldBankingV2() {
  const path = useLocation().pathname
  let page: React.ReactNode = <Dashboard />
  if (path === '/accounts') page = <Accounts />
  else if (path === '/transfers') page = <Transfers />
  else if (path === '/transactions') page = <Transactions />
  else if (path === '/savings') page = <Savings />
  else if (path === '/cards') page = <Cards />
  else if (path === '/statements') page = <Statements />
  else if (path === '/beneficiaries') page = <Simple eyebrow="MONEY" title="Beneficiaries" description="Manage verified recipients for transfers and payments." />
  else if (path === '/settings') page = <Simple eyebrow="SECURITY" title="Security Center" description="Protect your account, sessions and transaction authorization." />
  return <Shell>{page}</Shell>
}
