import { useEffect, useMemo, useState } from 'react'
import { Activity, Building2, ChevronRight, CreditCard, Download, Search, X } from 'lucide-react'
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
 return {id:`movement:${m.id}`,reference:normalizeFNCUBrand(m.reference),type:`${String(m.rail||'banking').toUpperCase()}_MOVEMENT`,kind:'Transfer',category:'Transfer',status:'Pending',amount:-Number(m.amount||0),currency:m.currency||'USD',direction:'debit',description:'Pending authorization',date:m.created_at?new Date(m.created_at).toISOString().slice(0,10):new Date().toISOString().slice(0,10),time:new Date(m.created_at||Date.now()).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),counterparty:recipient,memo:normalizeFNCUBrand(m.description)||null,fee:Number(m.fee||0),initiatedAt:m.created_at,effectiveDate:null,postedAt:null,postedBalanceAfter:null,availableBalanceAfter:null,accountId:m.source_account_id,metadata:{...meta,payment_rail:m.rail,authorization_stage:reserved?'token_issued':'awaiting_authorization',authorization_reserved:reserved,authorization_expires_at:expiresAt,money_movement_id:m.id}} as Transaction
}

function printReceipt(t:Transaction){
 const meta:any=t.metadata||{}
 const amount=money(Number(t.amount||0))
 const fromAccount=t.sourceAccount?.name?`${normalizeFNCUBrand(t.sourceAccount.name)} · •••• ${t.sourceAccount.accountLast4}`:t.direction==='debit'&&t.accountId?`FNCU account · •••• ${meta.account_last4||'—'}`:'—'
 const toAccount=t.destinationAccount?.name?`${normalizeFNCUBrand(t.destinationAccount.name)} · •••• ${t.destinationAccount.accountLast4}`:t.direction==='credit'&&t.accountId?`FNCU account · •••• ${meta.account_last4||'—'}`:normalizeFNCUBrand(t.counterparty||meta.merchant)||'—'
 const accountLast4=t.sourceAccount?.accountLast4||t.destinationAccount?.accountLast4||meta.account_last4||''
 const rows=[
  ['Date & time',`${fmt(t.postedAt||t.initiatedAt)} · ${time(t.postedAt||t.initiatedAt)}`],
  ['Status',status(t.status)],
  ['Description',normalizeFNCUBrand(t.description)||'Account activity'],
  ['To',toAccount],
  ['From',fromAccount],
  ['Account number',accountLast4?`••••••••${accountLast4}`:'—'],
  ['Payment method',rail(t)],
  ['Reference',normalizeFNCUBrand(t.reference)||'—'],
  ['Fee',money(Number(t.fee||0))]
 ]
 const popup=window.open('','_blank','width=520,height=760')
 if(!popup)return
 popup.document.write(`<!doctype html><html><head><title>FNCU Transaction Receipt</title><style>
 @page{size:auto;margin:0.5in}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#101828;background:#fff}
 .receipt{width:3.35in;margin:0 auto;padding:18px 0}.brand{text-align:center;border-bottom:1px solid #dfe3e8;padding-bottom:14px}
 .brand img{width:118px;height:auto;display:block;margin:0 auto 8px}.brand small{font-size:9px;letter-spacing:.12em;color:#667085}
 .type{text-align:center;margin:18px 0 4px;font-size:11px;font-weight:700;letter-spacing:.14em;color:#667085}
 .amount{text-align:center;font-size:28px;font-weight:700;margin:0 0 18px}.row{display:flex;justify-content:space-between;gap:18px;padding:8px 0;border-bottom:1px solid #edf0f3;font-size:10px}
 .row span:first-child{color:#667085}.row span:last-child{text-align:right;font-weight:600;max-width:62%;overflow-wrap:anywhere}
 .footer{text-align:center;border-top:1px solid #dfe3e8;margin-top:16px;padding-top:12px;color:#98a2b3;font-size:8px;line-height:1.5}
 @media print{.receipt{width:3.35in}}
 </style></head><body><main class="receipt"><header class="brand"><img src="${window.location.origin}/fncu-logo.png" alt="FNCU"><small>TRANSACTION RECEIPT</small></header><div class="type">${normalizeFNCUBrand(t.kind||'ACCOUNT ACTIVITY').toUpperCase()}</div><div class="amount">${amount}</div>${rows.map(([a,b])=>`<div class="row"><span>${String(a)}</span><span>${String(b)}</span></div>`).join('')}<footer class="footer">FNCU · Keep this receipt for your records.<br>Generated from your FNCU account activity.</footer></main><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`)
 popup.document.close()
}

export default function TransactionsPage(){
 const{transactions,session}=useCustomerData()
 const[q,setQ]=useState('');const[state,setState]=useState('All');const[open,setOpen]=useState<Transaction|null>(null);const[pendingMovements,setPendingMovements]=useState<Transaction[]>([])
 useEffect(()=>{let active=true;const load=async()=>{if(!session?.user){if(active)setPendingMovements([]);return};const{data:movements}=await supabase.from('money_movement_requests').select('*').eq('user_id',session.user.id).in('status',['pending','processing']).order('created_at',{ascending:false});if(!active)return;const ids=(movements||[]).map((m:any)=>m.id);if(!ids.length){setPendingMovements([]);return};const{data:tokens}=await supabase.from('transfer_tokens').select('movement_id,expires_at,status,created_at').in('movement_id',ids).eq('status','pending').order('created_at',{ascending:false});const latest=new Map<string,any>();for(const t of tokens||[]){if(!latest.has(t.movement_id))latest.set(t.movement_id,t)}setPendingMovements((movements||[]).map((m:any)=>movementToTransaction(m,latest.get(m.id))))};void load();return()=>{active=false}},[session])
 const allTransactions=useMemo(()=>[...pendingMovements,...transactions.filter(t=>!pendingMovements.some(p=>p.reference===t.reference))],[pendingMovements,transactions])
 const rows=useMemo(()=>allTransactions.filter(t=>(state==='All'||t.status===state)&&`${t.description||''} ${t.reference||''} ${t.counterparty||''} ${(t.metadata as any)?.institution_name||''} ${(t.metadata as any)?.merchant||''}`.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>eventMs(b)-eventMs(a)),[allTransactions,state,q])
 const meta:any=(open as any)?.metadata??{}
 return <BankingShell><div className="fb-page"><header className="fb-heading"><span>ACCOUNT ACTIVITY</span><h1>Transactions</h1><p>Posted, pending, failed and reversed activity with exact banking-event chronology.</p></header><div className="fb-card" style={{marginBottom:14}}><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><label style={{flex:'1 1 280px',display:'flex',alignItems:'center',gap:8,border:'1px solid #E4E7EC',borderRadius:8,padding:'0 11px',height:38}}><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search merchant, counterparty, bank or reference" style={{border:0,outline:0,width:'100%',fontSize:12}}/></label><select value={state} onChange={e=>setState(e.target.value)} style={{height:38,border:'1px solid #E4E7EC',borderRadius:8,padding:'0 10px'}}><option>All</option><option>Completed</option><option>Pending</option><option>Failed</option><option>Reversed</option></select></div></div><section className="fb-card"><div className="fb-card-head"><div><h2>{rows.length} transactions</h2><p>Newest banking event first. Pending authorizations are shown separately from posted ledger transactions.</p></div></div><div>{rows.map(t=>{const tm:any=t.metadata??{};const institution=normalizeFNCUBrand(tm.institution_name||t.institution?.name);const merchant=normalizeFNCUBrand(tm.merchant);const isCard=Boolean(merchant);const eventAt=t.postedAt||t.initiatedAt;return <button key={t.id} type="button" onClick={()=>setOpen(t)} style={{width:'100%',border:0,borderTop:'1px solid #F0F2F5',background:'#fff',padding:'14px 0',display:'grid',gridTemplateColumns:'36px minmax(0,1fr) auto auto',gap:12,alignItems:'center',textAlign:'left',cursor:'pointer'}}><span style={{width:34,height:34,borderRadius:9,display:'grid',placeItems:'center',background:t.status==='Pending'?'#FFF8E7':t.amount>=0?'#ECFDF3':'#FFF1F0',color:t.status==='Pending'?'#B54708':t.amount>=0?'#027A48':'#B42318'}}>{isCard?<CreditCard size={16}/>:t.kind==='Deposit'?<Activity size={16}/>:<Building2 size={16}/>}</span><span style={{minWidth:0}}><b style={{display:'block',fontSize:12,color:'#101828',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{normalizeFNCUBrand(t.description)}</b><small style={{display:'block',marginTop:4,color:'#667085',fontSize:10}}>{merchant||normalizeFNCUBrand(t.counterparty)||'Account activity'} · {institution||rail(t)} · {normalizeFNCUBrand(t.reference)}</small></span><span style={{textAlign:'right'}}><b style={{display:'block',fontSize:12,color:t.status==='Pending'?'#B54708':t.amount>=0?'#027A48':'#101828'}}>{t.amount>=0?'+':''}{money(t.amount)}</b><small style={{display:'block',marginTop:4,color:'#667085',fontSize:9}}>{fmt(eventAt)} · {time(eventAt)}</small></span><ChevronRight size={15} color="#98A2B3"/></button>})}</div></section>{open&&<div className="transaction-receipt-overlay" onClick={()=>setOpen(null)}><aside className="transaction-receipt" onClick={e=>e.stopPropagation()}><header className="transaction-receipt-head"><img src="/fncu-logo.png" alt="FNCU" draggable="false"/><button type="button" onClick={()=>setOpen(null)} aria-label="Close receipt"><X size={18}/></button></header><div className="transaction-receipt-title"><span>TRANSACTION RECEIPT</span><strong>{open.amount>=0?'+':''}{money(open.amount)}</strong><b className={`receipt-status receipt-status-${String(open.status).toLowerCase()}`}>{status(open.status)}</b></div><div className="transaction-receipt-details"><div><span>Date & time</span><b>{fmt(open.postedAt||open.initiatedAt)} · {time(open.postedAt||open.initiatedAt)}</b></div><div><span>Description</span><b>{normalizeFNCUBrand(open.description)||'Account activity'}</b></div><div><span>To</span><b>{normalizeFNCUBrand(open.destinationAccount?.name||meta.recipient_name||meta.merchant||open.counterparty)||'—'}{(open.destinationAccount?.accountLast4||meta.destination_account_last4)&&<> · ••••{open.destinationAccount?.accountLast4||meta.destination_account_last4}</>}</b></div><div><span>From</span><b>{normalizeFNCUBrand(open.sourceAccount?.name||meta.sender_name||(open.direction==='debit'?'FNCU account':meta.merchant))||'—'}{(open.sourceAccount?.accountLast4||meta.source_account_last4||meta.account_last4)&&<> · ••••{open.sourceAccount?.accountLast4||meta.source_account_last4||meta.account_last4}</>}</b></div><div><span>Account number</span><b>{(open.sourceAccount?.accountLast4||open.destinationAccount?.accountLast4||meta.account_last4)?`••••••••${open.sourceAccount?.accountLast4||open.destinationAccount?.accountLast4||meta.account_last4}`:'—'}</b></div><div><span>Payment method</span><b>{rail(open)}</b></div><div><span>Reference</span><b>{normalizeFNCUBrand(open.reference)||'—'}</b></div><div><span>Fee</span><b>{money(Number(open.fee||0))}</b></div></div><footer className="transaction-receipt-actions"><button type="button" className="fb-btn" onClick={()=>printReceipt(open)}><Download size={15}/> Download receipt</button></footer><p className="transaction-receipt-note">FNCU · Keep this receipt for your records.</p></aside></div>}</div></BankingShell>
}
