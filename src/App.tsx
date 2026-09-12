import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Bell, ChevronDown, CreditCard, FileText, HelpCircle, Home, LogOut, Menu, MessageSquare, MoveRight, Search, Settings, ShieldCheck, User, Users, Wallet, X, PiggyBank, Activity } from 'lucide-react'
import { customer } from './data/mockData'

const nav = [
  ['Dashboard', '/', Home], ['Accounts', '/accounts', Wallet], ['Savings', '/savings', PiggyBank], ['Transfers', '/transfers', MoveRight], ['Cards', '/cards', CreditCard], ['Transactions', '/transactions', Activity], ['Statements', '/statements', FileText], ['Beneficiaries', '/beneficiaries', Users], ['Messages', '/messages', MessageSquare], ['Support', '/support', HelpCircle], ['Settings', '/settings', Settings],
] as const

const money = (value: number) => `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark">F</div><div><strong>FOXSYCU</strong><span>DIGITAL BANKING SYSTEM</span></div><button className="close-mobile" onClick={() => setOpen(false)}><X size={18}/></button></div>
      <nav className="desktop-nav">{nav.map(([label, path, Icon]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><div className="security-note"><ShieldCheck size={17}/><span>Secure environment</span></div><button className="logout"><LogOut size={17}/> Sign out</button></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><button className="menu" onClick={() => setOpen(true)}><Menu size={22}/></button><div className="top-title">Digital Banking</div><div className="top-actions"><div className="search"><Search size={17}/><input placeholder="Search" aria-label="Search"/></div><button className="icon-btn" aria-label="Notifications"><Bell size={19}/><i/></button><button className="profile"><span className="avatar">YA</span><span className="profile-text"><strong>{customer.name}</strong><small>{customer.membership}</small></span><ChevronDown size={16}/></button></div></header>
      <main className="content">{children}</main>
      <div className="simulation-banner"><span>SIMULATED TEST DATA</span><em>Financial activity shown in this environment is not real money.</em></div>
    </div>
    <nav className="mobile-nav">{[['Home','/',Home],['Savings','/savings',PiggyBank],['Activity','/transactions',Activity],['Move','/transfers',MoveRight],['Profile','/profile',User]].map(([label,path,Icon]) => <NavLink key={label as string} to={path as string} end={path === '/'}>{<Icon size={19}/>}<span>{label as string}</span></NavLink>)}</nav>
  </div>
}

function Dashboard() { return <><section className="page-head"><div><p className="eyebrow">PERSONAL BANKING</p><h1>Good morning, {customer.name.split(' ')[0]}</h1><p>Here is your financial overview.</p></div><button className="primary">Move money <MoveRight size={17}/></button></section>
  <section className="balance-grid"><div className="balance-card"><div className="card-label"><span>AVAILABLE BALANCE</span><span className="currency">USD</span></div><div className="balance">{money(customer.availableBalance)}</div><div className="balance-sub">Available to move</div><div className="card-actions"><button>Deposit</button><button>Withdraw</button><button>Send USD</button></div></div><div className="metric-card"><span>SAVINGS BALANCE</span><strong>{money(customer.savingsBalance)}</strong><small>{customer.apy.toFixed(2)}% APY</small></div><div className="metric-card"><span>INTEREST EARNED</span><strong className="positive">+{money(customer.interestEarned)}</strong><small>This period</small></div></section>
  <section className="dashboard-grid"><div className="panel trend"><div className="panel-head"><div><h2>Account overview</h2><p>USD balance trend</p></div><select aria-label="Period"><option>Last 30 days</option><option>Last 90 days</option></select></div><div className="chart"><div className="chart-line"/><span>$12,450</span><span>$12,000</span><span>$11,500</span><span>$11,000</span></div></div><div className="panel quick"><div className="panel-head"><div><h2>Quick actions</h2><p>Common banking tasks</p></div></div><div className="quick-list"><button><Wallet/><span><b>View account</b><small>Account details</small></span></button><button><PiggyBank/><span><b>Save money</b><small>Create or fund a vault</small></span></button><button><Users/><span><b>Manage beneficiaries</b><small>Recipients and details</small></span></button></div></div></section>
  <section className="panel"><div className="panel-head"><div><h2>Recent activity</h2><p>Your latest simulated transactions</p></div><NavLink to="/transactions" className="text-link">View all</NavLink></div><div className="transactions">{customer.transactions.slice(0,4).map(t => <div className="transaction" key={t.id}><div className="tx-icon"><Wallet size={17}/></div><div className="tx-main"><b>{t.description}</b><small>{t.date} · {t.time}</small></div><div className={t.amount >= 0 ? 'tx-amount positive' : 'tx-amount'}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</div><span className="status">{t.status}</span></div>)}</div></section>
</> }

function Placeholder({ title }: { title: string }) { return <section className="placeholder"><p className="eyebrow">FOXSYCU</p><h1>{title}</h1><p>This customer-facing area is established in the application architecture. Detailed workflows will be implemented deliberately in later stages.</p></section> }

export default function App() { return <Shell><Routes><Route path="/" element={<Dashboard/>}/><Route path="/accounts" element={<Placeholder title="Accounts"/>}/><Route path="/savings" element={<Placeholder title="Savings"/>}/><Route path="/transfers" element={<Placeholder title="Transfers"/>}/><Route path="/cards" element={<Placeholder title="Cards"/>}/><Route path="/transactions" element={<Placeholder title="Transactions"/>}/><Route path="/statements" element={<Placeholder title="Statements"/>}/><Route path="/beneficiaries" element={<Placeholder title="Beneficiaries"/>}/><Route path="/messages" element={<Placeholder title="Messages"/>}/><Route path="/support" element={<Placeholder title="Support"/>}/><Route path="/settings" element={<Placeholder title="Settings"/>}/><Route path="/profile" element={<Placeholder title="Profile"/>}/></Routes></Shell> }
