import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Bell, Check, ClipboardList, CreditCard, FileText, Landmark, Mail, MapPin, Receipt, Send, ShieldCheck, Smartphone, WalletCards } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import './banking-services.css'

const services = [
  ['Deposit a check','Remote check deposit','deposit',Receipt],
  ['Bill Pay','Pay a company or person','billpay',ClipboardList],
  ['Send ACH','One-time or recurring ACH','ach',Send],
  ['Account to account','Move money from another bank','a2a',Landmark],
  ['P2P payment','Send money to a person','p2p',Smartphone],
  ['Statements','Monthly account statements','statements',FileText],
  ['Alerts','Balance and transaction alerts','alerts',Bell],
  ['eNotices','Official account notices','notices',Mail],
  ['Secure messages','Message FOXSYCU securely','messages',Mail],
  ['Loan center','Apply or make a payment','loans',CreditCard],
  ['Order checks','Reorder personal checks','checks',WalletCards],
  ['Request mailed check','Request a check mailed to you','mailed-check',Receipt],
  ['Locations & ATMs','Find branches and ATMs','locations',MapPin],
] as const

export default function BankingServicesPage(){
 const navigate=useNavigate(); const[params]=useSearchParams(); const requested=params.get('service'); const[active,setActive]=useState(requested||'home'); const[submitted,setSubmitted]=useState(false)
 useEffect(()=>setActive(requested||'home'),[requested])
 const title=active==='home'?'Banking services':services.find(s=>s[2]===active)?.[0]||'Banking service'
 const selected=services.find(s=>s[2]===active)
 const ServiceIcon=selected?.[3]||FileText
 const submit=(e:React.FormEvent)=>{e.preventDefault();setSubmitted(true)}
 const openService=(key:string)=>{setSubmitted(false);setActive(key);navigate(`/services?service=${key}`,{replace:true})}
 return <BankingShell>
  <div className="bs-page">
   <header className="bs-heading"><span>FOXSYCU DIGITAL BANKING</span><h1>{title}</h1><p>Everyday banking services, payments, documents and account support in one place.</p></header>
   {active==='home' ? <>
    <section className="bs-quick">
      <button onClick={()=>navigate('/transfers')}><ArrowRight size={17}/><span><b>Move money</b><small>Internal transfers and scheduled payments</small></span></button>
      <button onClick={()=>navigate('/transactions')}><Receipt size={17}/><span><b>View activity</b><small>Posted and pending transactions</small></span></button>
      <button onClick={()=>navigate('/messages')}><Mail size={17}/><span><b>Secure support</b><small>Message FOXSYCU securely</small></span></button>
    </section>
    <div className="bs-grid">{services.map(([label,desc,key,Icon])=><button className="bs-service" key={key} onClick={()=>openService(key)}><span className="bs-icon"><Icon size={18}/></span><span><b>{label}</b><small>{desc}</small></span><ArrowRight size={15}/></button>)}</div>
   </> : <>
    <button className="bs-back" onClick={()=>{setActive('home');navigate('/services',{replace:true})}}>← All banking services</button>
    {submitted ? <section className="bs-result"><span className="bs-success"><Check size={20}/></span><span>Request received</span><h2>Your {selected?.[0]?.toLowerCase()||'banking'} request is ready for processing.</h2><p>This demo preserves the workflow state without representing a real financial transfer or payment.</p><button className="bs-primary" onClick={()=>setSubmitted(false)}>Start another</button></section> : <section className="bs-panel">
      <div className="bs-panel-head"><span className="bs-icon"><ServiceIcon size={19}/></span><div><h2>{selected?.[0]}</h2><p>{selected?.[1]}</p></div></div>
      {active==='deposit' ? <form onSubmit={submit}><label>Deposit account<select><option>Primary Checking · •••• 4821</option><option>Savings · •••• 1904</option></select></label><label>Check amount<input inputMode="decimal" placeholder="$0.00" required/></label><div className="bs-notice"><ShieldCheck size={17}/><span>Endorse the back of the check with “For Remote Deposit Only FOXSYCU” before submitting.</span></div><button className="bs-primary">Continue to check images</button></form> : active==='statements' ? <div className="bs-document-list">{['September 2026','August 2026','July 2026','June 2026','May 2026','April 2026','March 2026','February 2026','January 2026','December 2025','November 2025','October 2025','September 2025'].map(x=><button key={x}><FileText size={16}/><span>{x}<small>Monthly account statement · PDF</small></span><ArrowRight size={15}/></button>)}</div> : active==='alerts'||active==='notices' ? <div className="bs-settings-list"><label><span><b>Low balance</b><small>Notify me when available balance falls below $100</small></span><input type="checkbox" defaultChecked/></label><label><span><b>Deposit posted</b><small>Notify me when a deposit becomes available</small></span><input type="checkbox" defaultChecked/></label><label><span><b>Transaction activity</b><small>Notify me when a new debit or credit posts</small></span><input type="checkbox"/></label><label><span><b>Loan payment</b><small>Notify me about upcoming or completed payments</small></span><input type="checkbox"/></label><button className="bs-primary" onClick={()=>setSubmitted(true)}>Save notification preferences</button></div> : active==='locations' ? <div className="bs-location"><div className="bs-map"><MapPin size={25}/><span>Branch & ATM locator</span><small>Use the institution locator to find a nearby branch, ATM or ITM.</small></div><button className="bs-secondary" onClick={()=>setSubmitted(true)}>Open locator</button></div> : <form onSubmit={submit}><label>From account<select><option>Primary Checking · •••• 4821</option><option>Savings · •••• 1904</option></select></label><label>Amount<input inputMode="decimal" placeholder="$0.00" required/></label><label>{active==='billpay'?'Payee':'Recipient'}<input placeholder="Name or company" required/></label><label>Reference / memo<input placeholder="Optional"/></label><div className="bs-notice"><AlertTriangle size={17}/><span>Review the amount, recipient and timing carefully before final submission.</span></div><button className="bs-primary">Review request</button></form>}
    </section>}
   </>}
   <footer className="bs-foot"><ShieldCheck size={14}/> Secure digital banking · USD accounts · Synthetic demonstration environment</footer>
  </div>
 </BankingShell>
}
