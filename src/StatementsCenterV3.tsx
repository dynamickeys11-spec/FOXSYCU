import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Printer, Search } from 'lucide-react'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import './feature-banking.css'

type Tx = any
const money = (n:number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const dateOf = (t:Tx) => String(t.effective_date || t.effectiveDate || t.date || '').slice(0,10)
const monthLabel = (key:string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US',{month:'long',year:'numeric'})
const netOf = (t:Tx) => (t.direction === 'DEBIT' ? -Number(t.amount) : Number(t.amount)) - Number(t.fee || 0)

export function StatementsCenterV3(){
 const {transactions,account,profile} = useCustomerData()
 const [query,setQuery]=useState('')
 const [selected,setSelected]=useState<string|null>(null)
 const [documents,setDocuments]=useState<any[]>([])
 const [busy,setBusy]=useState(false)
 const months=useMemo(()=>{
  const map=new Map<string,Tx[]>()
  transactions.forEach(t=>{const d=dateOf(t);if(!d)return;const k=d.slice(0,7);if(!map.has(k))map.set(k,[]);map.get(k)!.push(t)})
  return [...map.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([key,rows])=>{
   const sorted=rows.slice().sort((a,b)=>dateOf(a).localeCompare(dateOf(b)))
   const credits=sorted.reduce((s,t)=>s+(t.direction==='CREDIT'?Number(t.amount):0),0)
   const debits=sorted.reduce((s,t)=>s+(t.direction==='DEBIT'?Number(t.amount):0)+Number(t.fee||0),0)
   const net=credits-debits
   const opening=5000000-sorted.reduce((s,t)=>s+netOf(t),0)
   const closing=opening+net
   return {key,rows,credits,debits,net,opening,closing}
  })
 },[transactions])
 const filtered=months.filter(m=>monthLabel(m.key).toLowerCase().includes(query.toLowerCase()))
 useEffect(()=>{let alive=true;(async()=>{const {data:user}=await supabase.auth.getUser();if(!user||!alive)return;const {data}=await supabase.from('customer_documents').select('*,statement_periods(*)').eq('user_id',user.id).order('created_at',{ascending:false});if(alive)setDocuments(data||[])})();return()=>{alive=false}},[])
 const current=months.find(m=>m.key===selected)
 const statementNumber=(m:any)=>`FX-${m.key.replace('-','')}-${account?.id ? String(account.id).slice(0,6).toUpperCase() : '4821'}`
 const createStatement=async(m:any)=>{
  setBusy(true)
  try{
   const {data:user}=await supabase.auth.getUser();if(!user||!account)return
   const start=`${m.key}-01`;const end=new Date(new Date(start+'T00:00:00').getFullYear(),new Date(start+'T00:00:00').getMonth()+1,0).toISOString().slice(0,10)
   const number=statementNumber(m)
   const {data:period,error}=await supabase.from('statement_periods').upsert({user_id:user.id,account_id:account.id,period_start:start,period_end:end,opening_balance:m.opening,closing_balance:m.closing,total_credits:m.credits,total_debits:m.debits,transaction_count:m.rows.length,statement_number:number,status:'final'},{onConflict:'user_id,account_id,period_start,period_end'}).select().single()
   if(error)throw error
   await supabase.from('customer_documents').upsert({user_id:user.id,account_id:account.id,document_type:'statement',title:`${monthLabel(m.key)} Statement`,statement_period_id:period.id,mime_type:'application/pdf',status:'available'},{onConflict:'statement_period_id'})
   const {data}=await supabase.from('customer_documents').select('*,statement_periods(*)').eq('user_id',user.id).order('created_at',{ascending:false});setDocuments(data||[])
   setSelected(m.key)
  }finally{setBusy(false)}
 }
 const printStatement=(m:any)=>{
  const rows=m.rows.slice().sort((a:Tx,b:Tx)=>dateOf(a).localeCompare(dateOf(b))).map((t:Tx)=>`<tr><td>${dateOf(t)}</td><td>${String(t.description||t.merchant||t.counterparty||'Transaction')}</td><td>${t.direction==='CREDIT'?money(Number(t.amount)):'-'}</td><td>${t.direction==='DEBIT'?money(Number(t.amount)+Number(t.fee||0)):'-'}</td></tr>`).join('')
  const html=`<!doctype html><html><head><title>FOXSYCU ${monthLabel(m.key)} Statement</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#111}h1{margin:0 0 4px}small{color:#666}.meta{display:flex;justify-content:space-between;margin:28px 0}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}.box{border:1px solid #ddd;padding:14px}.box b{display:block;font-size:18px;margin-top:5px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{text-transform:uppercase;font-size:11px;color:#666}</style></head><body><h1>FOXSYCU</h1><small>DIGITAL BANKING SYSTEM · ${monthLabel(m.key)} Statement</small><div class="meta"><div>Account<br><b>${account?.name||'Private Checking'} · ••••${account?.last4||'4821'}</b></div><div>Statement No.<br><b>${statementNumber(m)}</b></div></div><div class="summary"><div class="box">Opening balance<b>${money(m.opening)}</b></div><div class="box">Credits<b>${money(m.credits)}</b></div><div class="box">Debits & fees<b>${money(m.debits)}</b></div><div class="box">Closing balance<b>${money(m.closing)}</b></div></div><table><thead><tr><th>Date</th><th>Description</th><th>Credits</th><th>Debits</th></tr></thead><tbody>${rows}</tbody></table><p><small>Customer: ${profile?.full_name||'John Doe'} · Currency: USD · This statement is generated from the FOXSYCU account ledger.</small></p><script>window.onload=()=>window.print()</script></body></html>`
  const w=window.open('','_blank');if(w){w.document.write(html);w.document.close()}
 }
 return <BankingShell><div className="fb-page"><header className="fb-heading"><span>DOCUMENTS</span><h1>Statements & documents</h1><p>Immutable statement periods, account history and a central document archive.</p></header><section className="fb-card"><div className="fb-card-head"><div><h2>Monthly statements</h2><p>Finalized periods derived from account activity.</p></div><div className="fb-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search statements"/></div></div><div className="fb-list">{filtered.map(m=><div className="fb-list-row" key={m.key}><span className="fb-avatar"><FileText size={17}/></span><div><b>{monthLabel(m.key)}</b><small>{m.rows.length} transactions · Closing {money(m.closing)}</small></div><span style={{marginLeft:'auto',fontWeight:700}}>{money(m.net)}</span><button className="fb-link-btn" onClick={()=>setSelected(m.key)}>View</button><button className="fb-icon" title="Create/finalize" disabled={busy} onClick={()=>createStatement(m)}><Download size={16}/></button></div>)}</div></section><section className="fb-card"><div className="fb-card-head"><div><h2>Document archive</h2><p>Statement records persisted to the customer document index.</p></div></div>{documents.length===0?<div className="fb-empty">No finalized statement documents yet. Open a statement above to create its immutable record.</div>:<div className="fb-list">{documents.map(d=><div className="fb-list-row" key={d.id}><span className="fb-avatar"><FileText size={17}/></span><div><b>{d.title}</b><small>{d.document_type} · {new Date(d.created_at).toLocaleDateString()}</small></div><span style={{marginLeft:'auto'}}>{d.status}</span></div>)}</div>}</section>{current&&<div className="fb-modal"><div className="fb-dialog" style={{maxWidth:760}}><button className="fb-x" onClick={()=>setSelected(null)}>×</button><span>FINAL STATEMENT</span><h2>{monthLabel(current.key)}</h2><div className="fb-grid"><div className="fb-detail"><span>Opening</span><b>{money(current.opening)}</b></div><div className="fb-detail"><span>Closing</span><b>{money(current.closing)}</b></div><div className="fb-detail"><span>Credits</span><b>{money(current.credits)}</b></div><div className="fb-detail"><span>Debits & fees</span><b>{money(current.debits)}</b></div></div><div className="fb-actions"><button className="fb-btn primary" onClick={()=>createStatement(current)} disabled={busy}><Download size={15}/> Finalize record</button><button className="fb-btn" onClick={()=>printStatement(current)}><Printer size={15}/> Print / Save PDF</button></div></div></div>}</div></BankingShell>
}
