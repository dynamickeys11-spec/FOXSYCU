import { useMemo, useState } from 'react'
import { Bell, CalendarDays, MessageSquare, Search, ShieldCheck, X } from 'lucide-react'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import CustomerServiceChatPage from './CustomerServiceChatPage'
import { useLocation } from 'react-router-dom'
import './feature-banking.css'

const dateTime=(v:any)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}
const fmtDate=(v:any)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
const fmtTime=(v:any)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`

export default function MessagesPage(){
 const location=useLocation();const view=new URLSearchParams(location.search).get('view')
 if(view==='customer-service')return <CustomerServiceChatPage/>
 const isAlerts=view==='alerts'
 const{messages,notifications,transactions}=useCustomerData();const[q,setQ]=useState('');const[open,setOpen]=useState<any|null>(null)
 const txMap=useMemo(()=>new Map(transactions.map(t=>[t.reference,t])),[transactions])
 const rows=useMemo(()=>{
  const source=isAlerts?notifications:messages
  return source.filter((m:any)=>`${m.title||''} ${m.subject||''} ${m.body||''} ${m.transaction_reference||''}`.toLowerCase().includes(q.toLowerCase())).sort((a:any,b:any)=>new Date(b.created_at||b.event_at||0).getTime()-new Date(a.created_at||a.event_at||0).getTime())
 },[isAlerts,notifications,messages,q])
 const linked=(m:any)=>m?.transaction_reference?txMap.get(m.transaction_reference):undefined
 return <BankingShell><div className="fb-page"><header className="fb-heading"><span>{isAlerts?'ACCOUNT ALERTS':'SECURE COMMUNICATION'}</span><h1>{isAlerts?'Alerts':'Secure Messages'}</h1><p>{isAlerts?'Review account, transaction and security notifications from FNCU.':'Communicate securely with FNCU regarding your account and banking services.'}</p></header>
  <div className="fb-card" style={{marginBottom:14}}><label style={{display:'flex',alignItems:'center',gap:8,border:'1px solid #E4E7EC',borderRadius:8,padding:'0 11px',height:38}}><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={isAlerts?'Search alerts':'Search secure messages'} style={{border:0,outline:0,width:'100%',fontSize:12}}/></label></div>
  <section className="fb-card"><div className="fb-card-head"><div><h2>{isAlerts?'Notifications':'Inbox'}</h2><p>{rows.length} {isAlerts?'alert':'message'}{rows.length===1?'':'s'} · newest first</p></div></div>
   <div>{rows.map((m:any)=>{const t=linked(m);const at=m.created_at||m.event_at;const subject=isAlerts?(m.title||'Account alert'):(m.subject||'Secure message');return <button key={m.id} type="button" onClick={()=>setOpen(m)} style={{width:'100%',border:0,borderTop:'1px solid #F0F2F5',background:'#fff',padding:'14px 0',display:'grid',gridTemplateColumns:'34px minmax(0,1fr) auto',gap:12,alignItems:'start',textAlign:'left',cursor:'pointer'}}><span style={{width:32,height:32,borderRadius:8,display:'grid',placeItems:'center',background:m.priority==='urgent'?'#FFF1F0':'#EFF4FF',color:m.priority==='urgent'?'#B42318':'#155EEF'}}>{isAlerts?(m.notification_type==='security'?<ShieldCheck size={15}/>:<Bell size={15}/>):<MessageSquare size={15}/>}</span><span style={{minWidth:0}}><b style={{display:'block',fontSize:12,color:'#101828'}}>{subject}</b><strong style={{display:'block',marginTop:4,fontSize:10,lineHeight:1.45,color:'#667085',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.body||'No message content.'}</strong><small style={{display:'block',marginTop:6,color:'#98A2B3',fontSize:9}}>{isAlerts?(m.notification_type||'Account alert'):(t?`${t.description} · ${t.reference}`:'FNCU Secure Message')}</small></span><span style={{fontSize:9,color:'#667085',whiteSpace:'nowrap',textAlign:'right'}}><b style={{display:'block',fontSize:9,fontWeight:600}}>{fmtDate(at)}</b><small style={{display:'block',marginTop:3}}>{fmtTime(at)}{!m.read_at&&<i style={{display:'inline-block',marginLeft:7,width:6,height:6,borderRadius:'50%',background:'#155EEF'}}/>}</small></span></button>})}</div>
  </section>
  {open&&<div className="drawer-backdrop" onClick={()=>setOpen(null)}><aside className="drawer" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}><div className="drawer-head"><div><small>{isAlerts?'ACCOUNT ALERT':'SECURE MESSAGE'}</small><h2>{isAlerts?(open.title||'Account alert'):(open.subject||'Secure message')}</h2></div><button className="icon-button" onClick={()=>setOpen(null)}><X size={18}/></button></div><p style={{fontSize:12,lineHeight:1.6,color:'#475467'}}>{open.body||'No message content.'}</p>{!isAlerts&&(()=>{const t=linked(open);const meta:any=t?.metadata??{};return t?<div className="drawer-details"><div><span>Transaction date</span><b>{fmtDate(t.date)}</b></div><div><span>Transaction time</span><b>{t.time||fmtTime(t.postedAt||t.initiatedAt)}</b></div><div><span>Transaction</span><b>{t.description}</b></div><div><span>Amount</span><b>{t.amount>=0?'+':''}{money(Number(t.amount||0))}</b></div><div><span>Status</span><b>{t.status}</b></div><div><span>Payment rail</span><b>{String(meta.payment_rail||'').replace(/_/g,' ')||'—'}</b></div><div><span>Reference</span><b>{t.reference||open.transaction_reference}</b></div></div>:null})()}<div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #F0F2F5',display:'flex',gap:10,color:'#667085',fontSize:9}}><CalendarDays size={15}/><span>{isAlerts?'This notification is provided as part of your FNCU account activity and security alerts.':'This secure message is part of your private communication with FNCU.'}</span></div></aside></div>}
 </div></BankingShell>
}
