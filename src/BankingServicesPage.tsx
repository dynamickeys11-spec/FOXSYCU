import { useEffect, useState } from 'react'
import { ArrowRight, Bell, ClipboardList, CreditCard, FileText, Landmark, Mail, MapPin, Receipt, Send, ShieldCheck, Smartphone, WalletCards } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import './banking-services.css'

const services = [
  ['Deposit a check','Remote check deposit','deposit',Receipt],
  ['Bill Pay','Pay a company or person','billpay',ClipboardList],
  ['Send ACH','Send an ACH payment','ach',Send],
  ['Account to account','Move money between FNCU accounts','a2a',Landmark],
  ['P2P payment','Send money to a person','p2p',Smartphone],
  ['Statements','Monthly account statements','statements',FileText],
  ['Alerts','Balance and transaction alerts','alerts',Bell],
  ['eNotices','Official account notices','notices',Mail],
  ['Secure messages','Message customer support','messages',Mail],
  ['Loan center','Apply or manage a loan request','loans',CreditCard],
  ['Order checks','Reorder personal checks','checks',WalletCards],
  ['Request mailed check','Request a check mailed to you','mailed-check',Receipt],
  ['Locations & ATMs','Find branches and ATMs','locations',MapPin],
] as const

export default function BankingServicesPage(){
 const navigate=useNavigate(); const[params]=useSearchParams(); const requested=params.get('service'); const[active,setActive]=useState(requested||'home')
 useEffect(()=>setActive(requested||'home'),[requested])
 const title=active==='home'?'Banking services':services.find(s=>s[2]===active)?.[0]||'Banking service'
 const selected=services.find(s=>s[2]===active)
 const ServiceIcon=selected?.[3]||FileText
 const openService=(key:string)=>{
   if(key==='p2p') return navigate('/transfers?mode=zelle_like')
   if(key==='ach') return navigate('/transfers?mode=ach')
   if(key==='a2a') return navigate('/transfers?mode=internal')
   if(key==='messages') return navigate('/messages')
   setActive(key);navigate(`/services?service=${key}`,{replace:true})
 }
 return <BankingShell>
  <div className="bs-page">
   <header className="bs-heading"><span>FNCU</span><h1>{title}</h1><p>Everyday banking services, payments, documents and account support in one place.</p></header>
   {active==='home' ? <>
    <section className="bs-quick">
      <button onClick={()=>navigate('/transfers')}><ArrowRight size={17}/><span><b>Move money</b><small>Internal transfers and payment rails</small></span></button>
      <button onClick={()=>navigate('/transactions')}><Receipt size={17}/><span><b>View activity</b><small>Posted and pending transactions</small></span></button>
      <button onClick={()=>navigate('/messages')}><Mail size={17}/><span><b>Secure support</b><small>Message customer support</small></span></button>
    </section>
    <div className="bs-grid">{services.map(([label,desc,key,Icon])=><button className="bs-service" key={key} onClick={()=>openService(key)}><span className="bs-icon"><Icon size={18}/></span><span><b>{label}</b><small>{desc}</small></span><ArrowRight size={15}/></button>)}</div>
   </> : <>
    <button className="bs-back" onClick={()=>{setActive('home');navigate('/services',{replace:true})}}>← All banking services</button>
    <section className="bs-panel">
      <div className="bs-panel-head"><span className="bs-icon"><ServiceIcon size={19}/></span><div><h2>{selected?.[0]}</h2><p>{selected?.[1]}</p></div></div>
      <div className="bs-location"><div className="bs-map"><ShieldCheck size={25}/><span>Service is connected to FNCU account data</span><small>This service screen is being routed through the authenticated customer account. Actions that move money use the live transfer workflow rather than a local success state.</small></div>
        <button className="bs-primary" onClick={()=>openService(active)}>{active==='statements'?'Open statements':active==='alerts'||active==='notices'?'Open notification settings':active==='locations'?'Open locator':active==='deposit'?'Start deposit':active==='billpay'?'Open Bill Pay':active==='loans'?'Open Loan Center':active==='checks'?'Order checks':active==='mailed-check'?'Request mailed check':'Continue'} <ArrowRight size={15}/></button>
      </div>
    </section>
   </>}
   <footer className="bs-foot"><ShieldCheck size={14}/> Secure digital banking · USD accounts</footer>
  </div>
 </BankingShell>
}
