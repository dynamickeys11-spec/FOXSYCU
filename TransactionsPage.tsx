import { useEffect, useMemo, useState } from 'react'
import { Activity, Building2, ChevronRight, CreditCard, Search, X } from 'lucide-react'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import type { Transaction } from './types'
import './feature-banking.css'

const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const fmt=(v:any)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
const time=(v:any)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
const eventMs=(t:any)=>{const v=t.postedAt||t.initiatedAt||t.date;const d=new Date(v);return Number.isNaN(d.getTime())?0:d.getTime()}
const rail=(t:any)=>String(t.metadata?.payment_rail||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())||'Banking activity'
const status=(v:any)=>String(v||'').replace(/^./,c=>c.toUpperCase())
const normalizeFNCUBrand=(value:any)=>typeof value==='string'?value.replace(/\bFOXSYCU\b/gi,'FNCU'):value

function movementToTransaction(m:any,token:any):Transaction{
 const rawMeta:any=m.metadata||{}
 const meta:any=Object.fromEntries(Object.entries(rawMeta).map(([key,value])=>[key,normalizeFNCUBrand(value)]))
 const recipient=normalizeFNCUBrand(meta.counterparty||meta.recipient_name||'External recipient')
 const reserved=Boolean(meta.authorization_reserved)
 const expiresAt=token?.expires_at||null
 return {
  id:`movement:${m.id}`,
  reference:normalizeFNCUBrand(m.reference),
  type:`${String(m.rail||'banking').toUpperCase()}_MOVEMENT`,
  kind:'Transfer',
  category:'Transfer',
  status:'Pending',
  amount:-Number(m.amount||0),
  currency:m.currency||'USD',
  direction:'debit',
  description:'Pending authorization',
  date:m.created_at?new Date(m.created_at).toISOString().slice(0,10):new Date().toISOString().slice(0,10),
  time:new Date(m.created_at||Date.now()).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),
  counterparty:recipient,
  memo:normalizeFNCUBrand(m.description)||null,
  fee:Number(m.fee||0),
  initiatedAt:m.created_at,
  effectiveDate:null,
  postedAt:null,
  postedBalanceAfter:null,
  availableBalanceAfter:null,
  accountId:m.source_account_id,
  metadata:{...meta,payment_rail:m.rail,authorization_stage:reserved?'token_issued':'awaiting_authorization',authorization_reserved:reserved,authorization_expires_at:expiresAt,money_movement_id:m.id}
 } as Transaction
}

export default function TransactionsPage(){
 const{transactions,session}=useCustomerData()
 const[q,setQ]=useState('');const[state,setState]=useState('All');const[open,setOpen]=useState<Transaction|null>(null);const[pendingMovements,setPendingMovements]=useState<Transaction[]>([])
 useEffect(()=>{
  let active=true
  const load=async()=>{
   if(!session?.user){if(active)setPendingMovements([]);return}
   const{data:movements}=await supabase.from('money_movement_requests').select('*').eq('user_id',session.user.id).in('status',['pending','processing']).order('created_at',{ascending:false})
   if(!active)return
   const ids=(movements||[]).map((m:any)=>m.id)
   if(!ids.length){setPendingMovements([]);return}
   const{data:tokens}=await supabase.from('transfer_tokens').select('movement_id,expires_at,status,created_at').in('movement_id',ids).eq('status','pending').order('created_at',{ascending:false})
   const latest=new Map<string,any>();for(const t of tokens||[]){if(!latest.has(t.movement_id))latest.set(t.movement_id,t)}
   setPendingMovements((movements||[]).map((m:any)=>movementToTransaction(m,latest.get(m.id))))
  }
  void load();return()=>{active=false}
 },[session])
 const allTransactions=useMemo(()=>[...pendingMovements,...transactions.filter(t=>!pendingMovements.some(p=>p.reference===t.reference))],[pendingMovements,transactions])
 const rows=useMemo(()=>allTransactions.filter(t=>(state==='All'||t.status===state)&&`${t.description||''} ${t.reference||''} ${t.counterparty||''} ${(t.metadata as any)?.institution_name||''} ${(t.metadata as any)?.merchant||''}`.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>eventMs(b)-eventMs(a)),[allTransactions,state,q])
 const meta:any=(open as any)?.metadata??{}
 return <BankingShell><div className="fb-page"><header className="fb-heading"><span>ACCOUNT ACTIVITY</span><h1>Transactions</h1><p>Posted, pending, failed and reversed activity with exact banking-event chronology.</p></header><div className="fb-card" style={{marginBottom:14}}><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><label style={{flex:'1 1 280px',display:'flex',alignItems:'center',gap:8,border:'1px solid #E4E7EC',borderRadius:8,padding:'0 11px',height:38}}><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search merchant, counterparty, bank or reference" style={{border:0,outline:0,width:'100%',fontSize:12}}/></label><select value={state} onChange={e=>setState(e.target.value)} style={{height:38,border:'1px solid #E4E7EC',borderRadius:8,padding:'0 10px'}}><option>All</option><option>Completed</option><option>Pending</option><option>Failed</option><option>Reversed</option></select></div></div><section className="fb-card"><div className="fb-card-head"><div><h2>{rows.length} transactions</h2><p>Newest banking event first. Pending authorizations are shown separately from posted ledger transactions.</p></div></div><div>{rows.map(t=>{const tm:any=t.metadata??{};const institution=normalizeFNCUBrand(tm.institution_name||t.institution?.name);const merchant=normalizeFNCUBrand(tm.merchant);const isCard=Boolean(merchant);const eventAt=t.postedAt||t.initiatedAt;return <button key={t.id} type="button" onClick={()=>setOpen(t)} style={{width:'100%',border:0,borderTop:'1px solid #F0F2F5',background:'#fff',padding:'14px 0',display:'grid',gridTemplateColumns:'36px minmax(0,1fr) auto auto',gap:12,alignItems:'center',textAlign:'left',cursor:'pointer'}}><span style={{width:34,height:34,borderRadius:9,display:'grid',placeItems:'center',background:t.status==='Pending'?'#FFF8E7':t.amount>=0?'#ECFDF3':'#FFF1F0',color:t.status==='Pending'?'#B54708':t.amount>=0?'#027A48':'#B42318'}}>{isCard?<CreditCard size={16}/>:t.kind==='Deposit'?<Activity size={16}/>:<Building2 size={16}/>}</span><span style={{minWidth:0}}><b style={{display:'block',fontSize:12,color:'#101828',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{normalizeFNCUBrand(t.description)}</b><small style={{display:'block',marginTop:4,color:'#667085',fontSize:10}}>{merchant||normalizeFNCUBrand(t.counterparty)||'Account activity'} · {institution||rail(t)} · {normalizeFNCUBrand(t.reference)}</small></span><span style={{textAlign:'right'}}><b style={{display:'block',fontSize:12,color:t.status==='Pending'?'#B54708':t.amount>=0?'#027A48':'#101828'}}>{t.amount>=0?'+':''}{money(t.amount)}</b><small style={{display:'block',marginTop:4,color:'#667085',fontSize:9}}>{fmt(eventAt)} · {time(eventAt)}</small></span><ChevronRight size={15} color="#98A2B3"/></button>})}</div></section>{open&&<div className="drawer-backdrop" onClick={()=>setOpen(null)}><aside className="drawer" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}><div className="drawer-head"><div><small>TRANSACTION DETAIL</small><h2>{normalizeFNCUBrand(open.description)}</h2></div><button className="icon-button" onClick={()=>setOpen(null)}><X size={18}/></button></div><div className="drawer-amount"><strong>{open.amount>=0?'+':''}{money(open.amount)}</strong><span className={`status status-${String(open.status).toLowerCase()}`}>{status(open.status)}</span></div><div className="drawer-details"><div><span>Event timestamp</span><b>{fmt(open.postedAt||open.initiatedAt)} · {time(open.postedAt||open.initiatedAt)}</b></div><div><span>Payment rail</span><b>{rail(open)}</b></div><div><span>Institution</span><b>{normalizeFNCUBrand(meta.institution_name||open.institution?.name)||'—'}</b></div><div><span>Account</span><b>•••• {meta.account_last4||'—'}</b></div><div><span>Counterparty</span><b>{normalizeFNCUBrand(open.counterparty)||'—'}</b></div><div><span>Category</span><b>{normalizeFNCUBrand(meta.category||open.category)||'—'}</b></div><div><span>Reference</span><b>{normalizeFNCUBrand(open.reference)||'—'}</b></div><div><span>Initiated</span><b>{fmt(open.initiatedAt)} · {time(open.initiatedAt)}</b></div><div><span>Effective</span><b>{fmt(open.effectiveDate||open.date)}</b></div><div><span>Posted</span><b>{open.postedAt?`${fmt(open.postedAt)} · ${time(open.postedAt)}`:'Not posted'}</b></div><div><span>Fee</span><b>{money(Number(open.fee||0))}</b></div><div><span>Balance after</span><b>{open.availableBalanceAfter!=null?money(Number(open.availableBalanceAfter)):'—'}</b></div>{meta.authorization_stage&&<div><span>Authorization</span><b>{meta.authorization_stage==='token_issued'?(meta.authorization_expires_at?`Pending authorization · token expires ${fmt(meta.authorization_expires_at)} ${time(meta.authorization_expires_at)}`:'Pending authorization'):'Awaiting Transfer PIN'}</b></div>}{meta.authorization_reserved&&<div><span>Funds</span><b>Temporarily reserved while authorization is completed.</b></div>}{meta.merchant&&<div><span>Merchant</span><b>{normalizeFNCUBrand(meta.merchant)}</b></div>}{meta.merchant_location&&<div><span>Location</span><b>{meta.merchant_location}</b></div>}{meta.counterparty_details?.accountLast4&&<div><span>Counterparty account</span><b>•••• {meta.counterparty_details.accountLast4}</b></div>}{meta.ach_originator&&<div><span>ACH originator</span><b>{normalizeFNCUBrand(meta.ach_originator)} · trace {meta.trace_number}</b></div>}{meta.authorization_code&&<div><span>Authorization</span><b>{meta.authorization_code}</b></div>}{meta.resolution_due_at&&<div><span>Lifecycle</span><b>{meta.lifecycle_status==='pending'?`Pending — resolves automatically to ${meta.resolution_outcome}`:`Resolved ${meta.lifecycle_status||''}`}</b></div>}</div></aside></div>}</div></BankingShell>
}
