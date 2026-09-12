import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, Bell, CreditCard, FileText, Home, Menu, MoveRight, PiggyBank, Search, Settings, ShieldCheck, Users, Wallet, X } from 'lucide-react'
import { customer as seed } from './data/mockData'
import type { Transaction } from './types'
import './world-v2.css'
import './ux-audit.css'

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
  ['Security Center', '/security', ShieldCheck],
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

export function BankingShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const transactions = getTransactions()
  const matches = useMemo(
    () => transactions.filter(t => `${t.description} ${t.counterparty ?? ''} ${t.reference}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5),
    [transactions, query],
  )

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
        <nav aria-label="Primary banking navigation">
          {nav.map(([label, path, Icon]) => (
            <NavLink key={label} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `bank-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink className="security-foot" to="/security" aria-label="Open Security Center"><ShieldCheck size={16} /><div><b>Protected</b><small>Security center</small></div></NavLink>
      </aside>

      <div className="bank-body">
        <header className="bank-header">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open banking menu"><Menu size={20} /></button>
          <div className="header-title">PERSONAL BANKING</div>
          <div className="header-actions">
            <div className="global-search">
              <Search size={16} aria-hidden="true" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search activity" aria-label="Search account activity" />
              {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}
              {query && <div className="search-results">{matches.length ? matches.map(t => <NavLink key={t.id} to="/transactions" onClick={() => setQuery('')}><b>{t.description}</b><strong>{money(t.amount)}</strong><small>{t.date} · {t.reference}</small></NavLink>) : <span>No matching activity</span>}</div>}
            </div>
            <NavLink className="icon-button" to="/communication" aria-label="Open notifications and secure mailbox"><Bell size={18} /><i /></NavLink>
            <NavLink to="/private-banking" className="profile" aria-label="Open private banking profile"><span>JD</span><div><b>John Doe</b><small>Premium User</small></div></NavLink>
          </div>
        </header>
        <main className="bank-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile banking navigation">
        {([['Home', '/', Home], ['Savings', '/savings', PiggyBank], ['Activity', '/transactions', Activity], ['Move', '/transfers', MoveRight], ['Profile', '/private-banking', Settings]] as const).map(([label, path, Icon]) => (
          <NavLink key={label} to={path} end={path === '/'}><Icon size={18} aria-hidden="true" /><span>{label}</span></NavLink>
        ))}
      </nav>
    </div>
  )
}
