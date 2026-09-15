import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, MessageSquare, MoveRight, Plus, Send, WalletCards } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCustomerData } from './CustomerProvider'
import { BankingShell } from './BankingShell'
import './fncu-home.css'

const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const shortDate=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}

export default function FNCUHome(){
 const{account,vaults,profile,transactions}=useCustomerData();const navigate=useNavigate();const[visible,setVisible]=useState(true)
 const name=profile?.preferred_name||profile?.full_name||'Customer';const first=name.split(/\s+/)[0];const balance=Number(account?.available_balance||0);const savings=vaults.reduce((sum,v)=>sum+Number(v.balance||0),0)
 const recent=useMemo(()=>transactions.slice(0,5).map((t:any)=>({...t,amount:t.direction==='debit'?-Math.abs(Number(t.amount)):Number(t.amount)})),[transactions])
 const actions=[
  {label:'Transfer',icon:MoveRight,to:'/transfers'},
  {label:'Deposit',icon:Plus,to:'/transfers?mode=deposit'},
  {label:'Pay',icon:Send,to:'/transfers'},
  {label:'Message',icon:MessageSquare,to:'/messages'},
 ]
 return <BankingShell showHeader={false}>
   <div className="fh-reference-home">
     <header className="fh-topline">
       <div><span>Good morning</span><h1>{first}</h1></div>
       <button className="fh-profile-dot" onClick={()=>navigate('/profile')} aria-label="Open profile"><span>{name.split(/\s+/).map((p:string)=>p[0]).join('').slice(0,2).toUpperCase()}</span></button>
     </header>

     <section className="fh-balance-card" aria-label="FNCU checking account balance">
       <div className="fh-card-top"><div><span>CHECKING ACCOUNT</span><small>USD · AVAILABLE</small></div><button onClick={()=>setVisible(v=>!v)} aria-label={visible?'Hide balance':'Show balance'}>{visible?<Eye size={17}/>:<EyeOff size={17}/>}</button></div>
       <strong>{visible?money(balance):'••••••••'}</strong>
       <div className="fh-account-meta"><span>Available balance</span><span>•••• {account?.account_number_last4||'----'}</span></div>
       <div className="fh-account-foot"><span>Posted {visible?money(Number(account?.posted_balance||balance)):'••••'}</span><span>FNCU</span></div>
     </section>

     <section className="fh-actions" aria-label="Primary banking actions">
       {actions.map(({label,icon:Icon,to})=><NavLink key={label} to={to} className="fh-action"><span><Icon size={18}/></span><b>{label}</b></NavLink>)}
     </section>

     <section className="fh-accounts">
       <div className="fh-section-head"><div><span>SAVINGS</span><h2>Savings at a glance</h2></div><NavLink to="/transfers">Manage</NavLink></div>
       <div className="fh-account-row"><span className="fh-account-icon"><WalletCards size={17}/></span><span><b>{vaults.length?`${vaults.length} savings ${vaults.length===1?'vault':'vaults'}`:'Savings'}</b><small>USD · total savings</small></span><strong>{visible?money(savings):'••••'}</strong></div>
     </section>

     <section className="fh-activity">
       <div className="fh-section-head"><div><span>RECENT ACTIVITY</span><h2>Transactions</h2></div><NavLink to="/transactions">View all</NavLink></div>
       <div className="fh-activity-list">
         {recent.map((t:any)=><button className="fh-activity-row" key={t.id} onClick={()=>navigate('/transactions')}>
           <span className={`fh-tx-badge ${t.amount>=0?'in':'out'}`}>{t.amount>=0?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span>
           <span className="fh-tx-main"><b>{t.description||t.counterparty||'Account activity'}</b><small>{shortDate(t.date||t.created_at||'')} · {t.account_name||'Checking'}</small></span>
           <strong className={t.amount>=0?'positive':''}>{t.amount>=0?'+':''}{money(t.amount)}</strong>
         </button>)}
         {!recent.length&&<div className="fh-empty">No transaction activity.</div>}
       </div>
     </section>
     <div className="fh-demo-note">FNCU DIGITAL BANKING · USD ACCOUNT · SYNTHETIC DEMO</div>
   </div>
 </BankingShell>
}
