import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Bell, ChevronRight, CreditCard, Ellipsis, Mail, Menu, MessageSquare, PiggyBank, Search, Send, WalletCards, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCustomerData } from './CustomerProvider'
import { BankingShell } from './BankingShell'
import './fncu-home.css'

const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const initials=(s:string)=>s.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'CU'
const formatDate=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}

export default function FNCUHome(){
 const {account,vaults,profile,transactions,notifications}=useCustomerData()
 const navigate=useNavigate()
 const [accountIndex,setAccountIndex]=useState(0)
 const [showTransactions,setShowTransactions]=useState(false)
 const [query,setQuery]=useState('')
 const name=profile?.preferred_name||profile?.full_name||'Customer'
 const first=name.split(/\s+/)[0]
 const avatar=profile?.avatar_url||''
 const savings=vaults.reduce((sum,v)=>sum+Number(v.balance||0),0)
 const pending=transactions.filter((t:any)=>String(t.status||'').toLowerCase()==='pending')
 const accounts=[
   {id:'checking',name:account?.account_name||'Checking',number:account?.account_number_last4||'----',balance:Number(account?.available_balance||0),available:'Available',icon:<WalletCards size={24}/>},
   {id:'savings',name:'Savings',number:vaults.length?`${vaults.length} vault${vaults.length===1?'':'s'}`:'Savings',balance:savings,available:'Balance',icon:<PiggyBank size={24}/>},
 ]
 const current=accounts[accountIndex%accounts.length]
 const data=useMemo(()=>transactions.slice(0,8).map((t:any)=>({
   ...t,
   amount:t.direction==='debit'?-Math.abs(Number(t.amount)):Number(t.amount),
 })),[transactions])
 const filtered=useMemo(()=>data.filter((t:any)=>`${t.description||''} ${t.counterparty||''} ${t.reference||''}`.toLowerCase().includes(query.toLowerCase())),[data,query])
 const shown=showTransactions?filtered:data.slice(0,6)
 const changeAccount=(direction:number)=>setAccountIndex(i=>(i+direction+accounts.length)%accounts.length)
 const avatarNode=<span className="fh-avatar">{avatar?<img src={avatar} alt=""/>:initials(name)}</span>
 return <BankingShell>
   <div className="fh-home">
     <header className="fh-welcome">
       <div className="fh-menu-trigger"><button className="fh-icon" aria-label="Open menu"><Menu size={26}/></button></div>
       <div className="fh-greeting"><span>FNCU PERSONAL BANKING</span><h1>Hi, {first}</h1></div>
       <NavLink to="/profile" className="fh-profile" aria-label="Open profile">{avatarNode}</NavLink>
     </header>

     <section className="fh-account-section">
       <div className="fh-section-heading"><h2>Accounts</h2><button aria-label="Account options"><Ellipsis size={23}/></button></div>
       <div className="fh-account-stage">
         <button className="fh-carousel-arrow left" onClick={()=>changeAccount(-1)} aria-label="Previous account"><ArrowLeft size={21}/></button>
         <button className="fh-account-card" onClick={()=>navigate(current.id==='checking'?'/accounts':'/savings')}>
           <div className="fh-account-card-top"><span className="fh-account-icon">{current.icon}</span><span className="fh-account-name">{current.name}</span><span className="fh-account-type">USD</span></div>
           <div className="fh-account-balance">{money(current.balance)}</div>
           <div className="fh-account-bottom"><span>{current.id==='checking'?`•••• ${current.number}`:current.number}</span><b>{current.available}</b></div>
         </button>
         <button className="fh-carousel-arrow right" onClick={()=>changeAccount(1)} aria-label="Next account"><ArrowRight size={21}/></button>
       </div>
       <div className="fh-dots" aria-label="Account selector">{accounts.map((a,i)=><button key={a.id} className={i===accountIndex?'active':''} onClick={()=>setAccountIndex(i)} aria-label={`Show ${a.name}`}/>)}</div>
       <NavLink to="/accounts" className="fh-view-all">View all <ChevronRight size={17}/></NavLink>
     </section>

     <section className="fh-actions" aria-label="Quick actions">
       <NavLink to="/transfers" className="fh-action"><span><Send/></span><b>Transfer</b><small>Move money</small></NavLink>
       <NavLink to="/transfers?mode=deposit" className="fh-action"><span><ArrowDownToLine/></span><b>Deposit</b><small>Add funds</small></NavLink>
       <NavLink to="/transfers" className="fh-action"><span><CreditCard/></span><b>Pay</b><small>Make a payment</small></NavLink>
       <NavLink to="/messages" className="fh-action"><span><MessageSquare/></span><b>Message</b><small>Secure inbox</small></NavLink>
     </section>

     <section className="fh-transactions">
       <div className="fh-tx-header"><div><span>ACCOUNT ACTIVITY</span><h2>Transactions</h2></div><div className="fh-tx-tools"><button className="fh-icon" onClick={()=>setShowTransactions(v=>!v)} aria-label="Search transactions"><Search size={22}/></button><button className="fh-icon" aria-label="Transaction options"><Ellipsis size={22}/></button></div></div>
       {showTransactions&&<div className="fh-search"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transactions"/><button onClick={()=>{setQuery('');setShowTransactions(false)}}><X size={17}/></button></div>}
       <div className="fh-tx-list">
         {shown.length?shown.map((t:any)=><button className="fh-tx-row" key={t.id} onClick={()=>navigate('/transactions')}>
           <span className={`fh-tx-icon ${t.amount>=0?'credit':'debit'}`}>{t.amount>=0?<ArrowDownToLine size={17}/>:<ArrowUpRight size={17}/>}</span>
           <span className="fh-tx-copy"><b>{t.description||t.counterparty||'Account activity'}</b><small>{formatDate(t.date||t.created_at||'')} · {t.account_name||current.name}</small></span>
           <span className={`fh-tx-amount ${t.amount>=0?'credit':''}`}>{t.amount>=0?'+':''}{money(t.amount)}</span>
         </button>):<div className="fh-empty">No transactions match your search.</div>}
       </div>
       {!showTransactions&&<button className="fh-see-more" onClick={()=>setShowTransactions(true)}>See more</button>}
     </section>

     <section className="fh-bottom-grid">
       <NavLink to="/savings" className="fh-mini-card"><span className="fh-mini-icon"><PiggyBank size={18}/></span><span><small>SAVINGS</small><b>{money(savings)}</b><em>{vaults.length} vault{vaults.length===1?'':'s'}</em></span><ChevronRight size={18}/></NavLink>
       <NavLink to="/messages" className="fh-mini-card"><span className="fh-mini-icon"><Bell size={18}/></span><span><small>SECURE INBOX</small><b>{notifications.filter((n:any)=>!n.read_at).length} unread</b><em>Private messages</em></span><ChevronRight size={18}/></NavLink>
       <NavLink to="/cards" className="fh-mini-card"><span className="fh-mini-icon"><CreditCard size={18}/></span><span><small>DEBIT CARD</small><b>•••• {String((useCustomerData().card as any)?.last4||'4821')}</b><em>Manage card</em></span><ChevronRight size={18}/></NavLink>
     </section>

     <footer className="fh-footer"><span>FNCU · USD ACCOUNT</span><span>{pending.length} pending {pending.length===1?'item':'items'}</span></footer>
   </div>
 </BankingShell>
}
