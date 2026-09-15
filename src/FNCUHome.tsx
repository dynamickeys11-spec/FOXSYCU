import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, CreditCard, Eye, EyeOff, MessageSquare, MoreHorizontal, PiggyBank, Search, Send, WalletCards } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCustomerData } from './CustomerProvider'
import { BankingShell } from './BankingShell'
import './fncu-home.css'

const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const formatDate=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}

export default function FNCUHome(){
 const{account,vaults,profile,transactions}=useCustomerData();const navigate=useNavigate();const[visible,setVisible]=useState(true);const[query,setQuery]=useState('')
 const name=profile?.preferred_name||profile?.full_name||'Customer';const first=name.split(/\s+/)[0];const savings=vaults.reduce((sum,v)=>sum+Number(v.balance||0),0)
 const data=useMemo(()=>transactions.slice(0,8).map((t:any)=>({...t,amount:t.direction==='debit'?-Math.abs(Number(t.amount)):Number(t.amount)})),[transactions])
 const filtered=useMemo(()=>data.filter((t:any)=>`${t.description||''} ${t.counterparty||''} ${t.reference||''}`.toLowerCase().includes(query.toLowerCase())),[data,query])
 const balance=Number(account?.available_balance||0)
 return <BankingShell><div className="fh-home">
   <section className="fh-greeting"><div><span>PERSONAL BANKING</span><h1>Hello, {first}</h1><p>Good to see you again.</p></div><button className="fh-more" onClick={()=>navigate('/profile')} aria-label="Profile"><MoreHorizontal size={20}/></button></section>

   <section className="fh-primary-card" aria-label="Primary account">
     <div className="fh-card-top"><div><span>AVAILABLE BALANCE</span><button className="fh-eye" onClick={()=>setVisible(v=>!v)} aria-label={visible?'Hide balance':'Show balance'}>{visible?<Eye size={17}/>:<EyeOff size={17}/>}</button></div><b>USD</b></div>
     <strong>{visible?money(balance):'••••••••'}</strong>
     <div className="fh-card-meta"><span>{account?.account_name||'Checking Account'}</span><span>•••• {account?.account_number_last4||'----'}</span></div>
     <div className="fh-card-rule"/>
     <div className="fh-card-bottom"><span>FNCU</span><small>FIRST NATIONAL CREDIT UNION</small><WalletCards size={20}/></div>
   </section>

   <section className="fh-quick"><div className="fh-section-title"><h2>Quick actions</h2><NavLink to="/transfers">View all</NavLink></div><div className="fh-action-grid">
     <NavLink to="/transfers" className="fh-action"><span><Send/></span><b>Transfer</b></NavLink>
     <NavLink to="/transfers?mode=deposit" className="fh-action"><span><ArrowDownToLine/></span><b>Deposit</b></NavLink>
     <NavLink to="/cards" className="fh-action"><span><CreditCard/></span><b>Cards</b></NavLink>
     <NavLink to="/messages" className="fh-action"><span><MessageSquare/></span><b>Message</b></NavLink>
   </div></section>

   <section className="fh-accounts"><div className="fh-section-title"><h2>My accounts</h2><NavLink to="/accounts">See all</NavLink></div><div className="fh-account-row">
     <NavLink to="/accounts" className="fh-mini-account"><span className="fh-mini-icon"><WalletCards size={18}/></span><div><b>Checking</b><small>•••• {account?.account_number_last4||'----'}</small></div><strong>{visible?money(balance):'••••'}</strong></NavLink>
     <NavLink to="/savings" className="fh-mini-account"><span className="fh-mini-icon"><PiggyBank size={18}/></span><div><b>Savings</b><small>{vaults.length} {vaults.length===1?'vault':'vaults'}</small></div><strong>{visible?money(savings):'••••'}</strong></NavLink>
   </div></section>

   <section className="fh-transactions"><div className="fh-section-title fh-tx-title"><div><h2>Recent transactions</h2><p>Your latest account activity</p></div><NavLink to="/transactions">See all</NavLink></div><div className="fh-tx-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transactions"/></div><div className="fh-tx-list">{filtered.slice(0,6).map((t:any)=><button className="fh-tx-row" key={t.id} onClick={()=>navigate('/transactions')}><span className={`fh-tx-icon ${t.amount>=0?'credit':'debit'}`}>{t.amount>=0?<ArrowDownToLine size={16}/>:<ArrowUpRight size={16}/>}</span><span className="fh-tx-copy"><b>{t.description||t.counterparty||'Account activity'}</b><small>{formatDate(t.date||t.created_at||'')} · {t.account_name||'Checking'}</small></span><span className={`fh-tx-amount ${t.amount>=0?'credit':''}`}>{t.amount>=0?'+':''}{money(t.amount)}</span></button>)}{!filtered.length&&<div className="fh-empty">No transactions found.</div>}</div></section>

   <div className="fh-demo-note">FNCU DIGITAL BANKING · USD ACCOUNT · SYNTHETIC DEMO</div>
 </div></BankingShell>
}
