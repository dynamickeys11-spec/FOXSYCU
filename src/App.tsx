import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Activity, Bell, BriefcaseBusiness, ChevronDown, CreditCard, FileText, HelpCircle, Home, LogOut, Menu, MessageSquare, MoveRight, PiggyBank, Search, Settings, ShieldCheck, User, Users, Wallet, X } from 'lucide-react'
import { customer } from './data/mockData'

const nav = [
  ['Dashboard', '/', Home], ['Accounts', '/accounts', Wallet], ['Savings', '/savings', PiggyBank], ['Transfers', '/transfers', MoveRight], ['Cards', '/cards', CreditCard], ['Transactions', '/transactions', Activity], ['Statements', '/statements', FileText], ['Beneficiaries', '/beneficiaries', Users], ['Messages', '/messages', MessageSquare], ['Support', '/support', HelpCircle], ['Settings', '/settings', Settings],
] as const

const routeTitles: Record<string, string> = {
  '/accounts': 'Accounts', '/savings': 'Savings', '/transfers': 'Transfers', '/cards': 'Cards', '/transactions': 'Transactions', '/statements': 'Statements', '/beneficiaries': 'Beneficiaries', '/messages': 'Messages', '/support': 'Support', '/settings': 'Settings', '/profile': 'Profile',
}

const money = (value: number) => `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Brand() {
  return <div className="brand-lockup" aria-label="FOXSYCU Digital Banking System"><strong>FOXSYCU</strong><span>DIGITAL BANKING SYSTEM</span></div>
}

function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="sidebar-top"><Brand/><button className="close-mobile" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <nav className="desktop-nav" aria-label="Primary navigation">{nav.map(([label, path, Icon]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-footer"><div className="security-note"><ShieldCheck size={16}/><span>Secure environment</span></div><button className="logout"><LogOut size={16}/> Sign out</button></div>
    </aside>
    <div className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><span className="top-title">Digital Banking</span></div>
        <div className="top-actions"><label className="search"><Search size={16}/><input placeholder="Search" aria-label="Search"/></label><button className="icon-btn" aria-label="Notifications"><Bell size={19}/><i/></button><NavLink to="/messages" className="icon-btn message-button" aria-label="Messages"><MessageSquare size={18}/></NavLink><NavLink to="/profile" className="profile"><span className="avatar">JD</span><span className="profile-text"><strong>{customer.name}</strong><small>{customer.membership}</small></span><ChevronDown size={15}/></NavLink></div>
      </header>
      <main className="content">{children}</main>
      <div className="simulation-banner"><span>SIMULATED TEST DATA</span><em>Financial activity in this environment is not real money.</em></div>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{[['Home','/',Home],['Savings','/savings',PiggyBank],['Activity','/transactions',Activity],['Move','/transfers',MoveRight],['Profile','/profile',User]].map(([label,path,Icon]) => <NavLink key={label as string} to={path as string} end={path === '/'}>{<Icon size={19}/>}<span>{label as string}</span></NavLink>)}</nav>
  </div>
}

function Dashboard() {
  return <>
    <section className="page-head"><div><p className="eyebrow">PERSONAL BANKING</p><h1>Good morning, {customer.name.split(' ')[0]}</h1><p>Your USD financial overview, all in one place.</p></div><NavLink to="/transfers" className="primary">Move money <MoveRight size={17}/></NavLink></section>
    <section className="balance-grid">
      <article className="balance-card"><div className="card-label"><span>AVAILABLE BALANCE</span><span className="currency">USD</span></div><div className="balance">{money(customer.availableBalance)}</div><div className="balance-sub">Available to move</div><div className="card-actions"><NavLink to="/transfers">Deposit</NavLink><NavLink to="/transfers">Withdraw</NavLink><NavLink to="/transfers">Send USD</NavLink></div></article>
      <article className="metric-card"><span>SAVINGS BALANCE</span><strong>{money(customer.savingsBalance)}</strong><small>{customer.apy.toFixed(2)}% APY</small></article>
      <article className="metric-card"><span>INTEREST EARNED</span><strong className="positive">+{money(customer.interestEarned)}</strong><small>This period</small></article>
    </section>
    <section className="dashboard-grid">
      <article className="panel trend"><div className="panel-head"><div><h2>Account overview</h2><p>USD balance trend</p></div><select aria-label="Period"><option>Last 30 days</option><option>Last 90 days</option></select></div><div className="chart" aria-label="Illustrative balance trend chart"><div className="chart-line"/><span>$12,450</span><span>$12,000</span><span>$11,500</span><span>$11,000</span></div></article>
      <article className="panel quick"><div className="panel-head"><div><h2>Quick actions</h2><p>Common banking tasks</p></div></div><div className="quick-list"><NavLink to="/accounts"><Wallet/><span><b>View account</b><small>Account details</small></span></NavLink><NavLink to="/savings"><PiggyBank/><span><b>Save money</b><small>Create or fund a vault</small></span></NavLink><NavLink to="/beneficiaries"><Users/><span><b>Manage beneficiaries</b><small>Recipients and details</small></span></NavLink></div></article>
    </section>
    <section className="dashboard-grid lower-grid">
      <article className="panel"><div className="panel-head"><div><h2>Recent activity</h2><p>Your latest simulated transactions</p></div><NavLink to="/transactions" className="text-link">View all</NavLink></div><div className="transactions">{customer.transactions.map(t => <div className="transaction" key={t.id}><div className="tx-icon"><Activity size={16}/></div><div className="tx-main"><b>{t.description}</b><small>{t.date} · {t.time} · {t.reference}</small></div><div className={t.amount >= 0 ? 'tx-amount positive' : 'tx-amount'}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</div><span className="status">{t.status}</span></div>)}</div></article>
      <article className="panel savings-preview"><div className="panel-head"><div><h2>Savings performance</h2><p>Across your vaults</p></div><NavLink to="/savings" className="text-link">View savings</NavLink></div><div className="savings-total">{money(customer.savingsBalance)} <small>USD saved</small></div><div className="progress"><span style={{width:'62%'}}/></div><div className="savings-meta"><span>4.50% APY</span><span>+$31.25 earned</span></div><div className="vault-list">{customer.vaults.map(v => <div key={v.id}><span>{v.name}</span><b>{money(v.balance)}</b></div>)}</div></article>
    </section>
  </>
}

function Placeholder({ title }: { title: string }) { return <section className="placeholder"><div className="placeholder-icon"><BriefcaseBusiness size={19}/></div><p className="eyebrow">FOXSYCU CUSTOMER APPLICATION</p><h1>{title}</h1><p>This area is established in the customer application architecture. Detailed workflows will be implemented deliberately in subsequent stages.</p></section> }

function AppRoutes() {
  return <Routes><Route path="/" element={<Dashboard/>}/>{Object.entries(routeTitles).map(([path,title]) => <Route key={path} path={path} element={<Placeholder title={title}/>}/>)}</Routes>
}

export default function App() { return <Shell><AppRoutes/></Shell> }
