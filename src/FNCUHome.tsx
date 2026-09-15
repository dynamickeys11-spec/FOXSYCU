import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, BarChart3, CalendarDays, Eye, EyeOff, FileText, WalletCards } from 'lucide-react'
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
 const quick=[
  {label:'Analyze',icon:BarChart3,to:'/accounts'},
  {label:'Calendar',icon:CalendarDays,to:'/transactions'},
  {label:'Document',icon:FileText,to:'/statements'},
  {label:'Collect',icon:WalletCards,to:'/savings'},
 ]
 return <BankingShell showHeader={false}>
   <div className="fh-reference-home">
     <header className="fh-topline">
       <div><span>Hello,</span><h1>{first}</h1></div>
       <button className="fh-profile-dot" onClick={()=>navigate('/profile')} aria-label="Open profile"><span>{name.split(/\s+/).map((p:string)=>p[0]).join('').slice(0,2).toUpperCase()}</span></button>
     </header>

     <section className="fh-balance-card" aria-label="FNCU account balance">
       <div className="fh-card-brand"><span>FNCU</span><small>FIRST NATIONAL CREDIT UNION</small></div>
       <div className="fh-card-label">Available balance <button onClick={()=>setVisible(v=>!v)} aria-label={visible?'Hide balance':'Show balance'}>{visible?<Eye size={16}/>:<EyeOff size={16}/>}</button></div>
       <strong>{visible?money(balance):'••••••••'}</strong>
       <div className="fh-card-number">•••• {account?.account_number_last4||'----'} <span>USD</span></div>
       <div className="fh-card-footer"><span>{account?.account_name||'Checking Account'}</span><b>FNCU</b></div>
     </section>

     <section className="fh-quick-strip" aria-label="Banking shortcuts">
       {quick.map(({label,icon:Icon,to})=><NavLink key={label} to={to} className="fh-quick-item"><span><Icon size={18}/></span><b>{label}</b></NavLink>)}
     </section>

     <section className="fh-activity">
       <div className="fh-section-head"><div><span>ACTIVITY</span><h2>Transaction details</h2></div><NavLink to="/transactions">View all</NavLink></div>
       <div className="fh-activity-list">
         {recent.map((t:any)=><button className="fh-activity-row" key={t.id} onClick={()=>navigate('/transactions')}>
           <span className={`fh-tx-badge ${t.amount>=0?'in':'out'}`}>{t.amount>=0?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span>
           <span className="fh-tx-main"><b>{t.description||t.counterparty||'Account activity'}</b><small>{shortDate(t.date||t.created_at||'')} · {t.account_name||'Checking'}</small></span>
           <strong className={t.amount>=0?'positive':''}>{t.amount>=0?'+':''}{money(t.amount)}</strong>
         </button>)}
         {!recent.length&&<div className="fh-empty">No transaction activity.</div>}
       </div>
     </section>

     <section className="fh-balance-line"><span>Savings balance</span><b>{visible?money(savings):'••••'}</b></section>
     <div className="fh-demo-note">FNCU DIGITAL BANKING · USD ACCOUNT · SYNTHETIC DEMO</div>
   </div>
 </BankingShell>
}
