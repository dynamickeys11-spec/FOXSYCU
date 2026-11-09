import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Search } from 'lucide-react'
import { supabase } from './supabaseClient'
import AdminNavigation from './AdminNavigation'
import './admin.css'

type Customer={id:string;email:string|null;full_name:string|null;preferred_name:string|null;account_id:string|null;account_name:string|null;available_balance:number|null;posted_balance:number|null;account_status:string|null}
const money=(v:number|null|undefined)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0))
const CREDIT_TYPES=['Deposit','Cash Deposit','ACH Credit','Wire Transfer','Direct Deposit','Account Funding','Other']

export default function AdminCreditPage(){
 const[customers,setCustomers]=useState<Customer[]>([]);const[selected,setSelected]=useState<Customer|null>(null);const[query,setQuery]=useState('')
 const[amount,setAmount]=useState('');const[creditDate,setCreditDate]=useState('');const[creditTime,setCreditTime]=useState('');const[transactionType,setTransactionType]=useState('Deposit')
 const[reference,setReference]=useState('');const[description,setDescription]=useState('');const[memo,setMemo]=useState('');const[senderName,setSenderName]=useState('');const[senderAccount,setSenderAccount]=useState('');const[senderBank,setSenderBank]=useState('');const[routingNumber,setRoutingNumber]=useState('')
 const[effectiveDate,setEffectiveDate]=useState('');const[postingDate,setPostingDate]=useState('');const[internalNote,setInternalNote]=useState('')
 const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[error,setError]=useState('');const[success,setSuccess]=useState<{reference:string;balance:number}|null>(null)
 const load=async()=>{setLoading(true);setError('');const admin=await supabase.rpc('is_admin');if(admin.error||!admin.data){setError(admin.error?.message||'Admin access required');setLoading(false);return}const{data,error:e}=await supabase.rpc('admin_list_customers');if(e)setError(e.message);setCustomers((data||[]) as Customer[]);setLoading(false)}
 useEffect(()=>{void load()},[])
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?customers.filter(c=>`${c.preferred_name||''} ${c.full_name||''} ${c.email||''} ${c.account_name||''} ${c.id}`.toLowerCase().includes(q)):customers},[customers,query])
 const reset=()=>{setAmount('');setCreditDate('');setCreditTime('');setReference('');setDescription('');setMemo('');setSenderName('');setSenderAccount('');setSenderBank('');setRoutingNumber('');setEffectiveDate('');setPostingDate('');setInternalNote('')}
 const submit=async()=>{setError('');setSuccess(null);if(!selected?.account_id)return setError('Select a customer account first.');const n=Number(amount.replace(/[,$\s]/g,''));if(!Number.isFinite(n)||n<=0)return setError('Enter a valid credit amount greater than $0.');setSaving(true)
  const credit_details={amount:n,credit_date:creditDate||null,credit_time:creditTime||null,transaction_type:transactionType,reference:reference.trim()||null,description:description.trim()||null,memo:memo.trim()||null,sender_name:senderName.trim()||null,sender_account:senderAccount.trim()||null,sender_bank:senderBank.trim()||null,routing_number:routingNumber.trim()||null,effective_date:effectiveDate||null,posting_date:postingDate||null,internal_note:internalNote.trim()||null}
  const{data,error:e}=await supabase.rpc('admin_credit_account_detailed',{p_account_id:selected.account_id,p_credit_details:credit_details})
  if(e)setError(e.message);else if(data?.error)setError(String(data.error));else{setSuccess({reference:String(data.reference||'Credit posted'),balance:Number(data.new_available_balance||0)});reset();await load()}setSaving(false)}
 return <main className="admin-shell"><AdminNavigation/><section className="admin-main">
  <header className="admin-header"><div><div className="eyebrow">ACCOUNT SERVICING</div><h1>Credit customer account</h1><p className="admin-header-subtitle">Post a controlled USD credit directly to the customer's persistent ledger. Enter only the information actually available.</p></div></header>
  {error&&<div className="admin-error" role="alert">{error}</div>}{success&&<div className="admin-notice"><CheckCircle2 size={18}/><div><strong>Credit posted successfully</strong><span>{success.reference} · New available balance {money(success.balance)}</span></div></div>}
  <div className="admin-grid">
   <section className="admin-panel"><div className="panel-head"><h2>Select customer</h2></div><div className="admin-toolbar"><label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer…"/></label></div><div className="activity-list">{loading?<div className="empty-state">Loading accounts…</div>:filtered.map(c=><button key={c.id} className="activity activity-button" onClick={()=>setSelected(c)}><span className="customer-avatar">{(c.preferred_name||c.full_name||c.email||'C').charAt(0).toUpperCase()}</span><div><strong>{c.preferred_name||c.full_name||'Customer account'}</strong><small>{c.email||'No email'} · {c.account_name||'No account'}</small></div><b>{money(c.available_balance)}</b></button>)}</div></section>
   <section className="admin-panel"><div className="panel-head"><div><h2>Credit details</h2><p className="admin-header-subtitle">Amount is required. All other credit details are optional.</p></div></div>
    {selected?<><div className="customer-detail-grid"><div><span>Customer</span><strong>{selected.preferred_name||selected.full_name||'Customer account'}</strong></div><div><span>Account</span><strong>{selected.account_name||'—'}</strong></div><div><span>Current available</span><strong>{money(selected.available_balance)}</strong></div><div><span>Current posted</span><strong>{money(selected.posted_balance)}</strong></div></div>
    <label className="account-actions"><span>Credit amount (USD) *</span><input className="admin-input" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
    <label className="account-actions"><span>Transaction type</span><select className="admin-input" value={transactionType} onChange={e=>setTransactionType(e.target.value)}>{CREDIT_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="account-actions"><span>Reference / transaction ID</span><input className="admin-input" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Optional bank reference"/></label>
    <label className="account-actions"><span>Description</span><input className="admin-input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional customer-facing description"/></label>
    <label className="account-actions"><span>Memo</span><input className="admin-input" value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Optional memo"/></label>
    <div className="admin-grid"><label className="account-actions"><span>Credit date</span><input className="admin-input" type="date" value={creditDate} onChange={e=>setCreditDate(e.target.value)}/></label><label className="account-actions"><span>Credit time</span><input className="admin-input" type="time" value={creditTime} onChange={e=>setCreditTime(e.target.value)}/></label><label className="account-actions"><span>Effective date</span><input className="admin-input" type="date" value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/></label><label className="account-actions"><span>Posting date</span><input className="admin-input" type="date" value={postingDate} onChange={e=>setPostingDate(e.target.value)}/></label></div>
    <h3>Originating party</h3>
    <label className="account-actions"><span>Sender / originating party</span><input className="admin-input" value={senderName} onChange={e=>setSenderName(e.target.value)} placeholder="Optional sender name"/></label>
    <label className="account-actions"><span>Sender account</span><input className="admin-input" value={senderAccount} onChange={e=>setSenderAccount(e.target.value)} placeholder="Optional account identifier"/></label>
    <label className="account-actions"><span>Sender bank / institution</span><input className="admin-input" value={senderBank} onChange={e=>setSenderBank(e.target.value)} placeholder="Optional bank or institution"/></label>
    <label className="account-actions"><span>Routing number</span><input className="admin-input" inputMode="numeric" value={routingNumber} onChange={e=>setRoutingNumber(e.target.value)} placeholder="Optional routing number"/></label>
    <label className="account-actions"><span>Internal admin note</span><textarea className="admin-input" rows={3} value={internalNote} onChange={e=>setInternalNote(e.target.value)} placeholder="Optional internal note; not shown as customer transaction text"/></label>
    <div className="admin-notice"><strong>LEDGER CONTROL</strong><span>This creates one persisted credit transaction and updates the account balance atomically. Sensitive sender and routing identifiers are stored in masked form.</span></div>
    <button className="mini-action" disabled={saving} onClick={()=>void submit()}>{saving?'Posting credit…':'Post credit to account'}</button></>:<div className="empty-state">Select a customer account to begin.</div>}
   </section>
  </div>
 </section></main>
}