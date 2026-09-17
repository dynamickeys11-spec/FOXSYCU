import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, ChevronRight, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import './feature-banking.css'
import './bill-pay.css'

const money=(n:number)=>`$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const categories=['All','Utilities','Internet','Mobile','Insurance','Credit card','Loan','Housing','Other']
type Payee={id:string;name:string;account_reference:string|null;delivery_method:string;status:string;category:string}
type Biller={id:string;name:string;category:string;description:string|null}

export default function BillPayPage(){
 const{account,profile}=useCustomerData();const navigate=useNavigate()
 const[payees,setPayees]=useState<Payee[]>([]);const[billers,setBillers]=useState<Biller[]>([]);const[selected,setSelected]=useState<Payee|null>(null)
 const[search,setSearch]=useState('');const[categoryFilter,setCategoryFilter]=useState('All');const[reference,setReference]=useState('');const[amount,setAmount]=useState('')
 const[date,setDate]=useState(new Date().toISOString().slice(0,10));const[showDirectory,setShowDirectory]=useState(true);const[showReference,setShowReference]=useState(false)
 const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const[paidAmount,setPaidAmount]=useState(0);const[error,setError]=useState('')
 const value=Number(amount)||0;const available=Number(account?.available_balance||0);const today=new Date().toISOString().slice(0,10)
 const load=async()=>{const[{data:pd,error:pe},{data:bd,error:be}]=await Promise.all([supabase.from('bill_payees').select('id,name,account_reference,delivery_method,status,category').eq('status','active').order('name'),supabase.from('biller_directory').select('id,name,category,description').eq('active',true).order('sort_order').order('name')]);if(pe){setError(pe.message);return}if(be){setError(be.message);return}setPayees((pd||[])as Payee[]);setBillers((bd||[])as Biller[])}
 useEffect(()=>{void load()},[])
 const visible=useMemo(()=>billers.filter(b=>(categoryFilter==='All'||b.category===categoryFilter)&&(!search.trim()||`${b.name} ${b.category}`.toLowerCase().includes(search.trim().toLowerCase()))),[billers,categoryFilter,search])
 const chooseBiller=async(b:Biller)=>{setError('');setBusy(true);try{const existing=payees.find(p=>p.name.toLowerCase()===b.name.toLowerCase());if(existing){setSelected(existing);setShowDirectory(false);return}if(!profile?.id)throw new Error('Unable to select this biller right now.');setReference('');setSelected({id:b.id,name:b.name,account_reference:null,delivery_method:'electronic',status:'active',category:b.category});setShowReference(true);setShowDirectory(false)}catch(e:any){setError(e?.message||'Unable to select this biller.')}finally{setBusy(false)}}
 const saveDirectoryPayee=async()=>{if(!selected||!profile?.id)return;setBusy(true);setError('');try{const{data,error:e}=await supabase.from('bill_payees').insert({user_id:profile.id,name:selected.name,account_reference:reference.trim()||null,category:selected.category,delivery_method:'electronic',status:'active'}).select('id,name,account_reference,delivery_method,status,category').single();if(e)throw e;setSelected(data as Payee);setShowReference(false);setReference('');await load()}catch(e:any){setError(e?.message||'Unable to save this biller.')}finally{setBusy(false)}}
 const pay=async()=>{if(!account||!selected||value<=0||value>available)return;setBusy(true);setError('');try{const{data,error:e}=await supabase.rpc('create_bill_payment',{p_payee_id:selected.id,p_account_id:account.id,p_amount:value,p_scheduled_for:date});if(e)throw e;setPaidAmount(value);setMessage(data?.reference||'Payment scheduled');setAmount('')}catch(e:any){setError(e?.message||'Unable to schedule this payment.')}finally{setBusy(false)}}
 if(message)return <BankingShell><div className="fb-page bill-pay-workspace"><header className="fb-heading bill-pay-heading"><span>PAYMENTS</span><h1>Payment scheduled</h1><p>Your payment has been scheduled successfully.</p></header><section className="fb-card bill-success-card"><div className="fb-success"><Check size={22}/><div><b>{money(paidAmount)} to {selected?.name}</b><p>Reference {message}</p></div></div><div className="fb-actions"><button className="fb-btn primary" onClick={()=>{setMessage('');setSelected(null);setAmount('');setShowDirectory(true)}}>Pay another bill</button><button className="fb-btn" onClick={()=>navigate('/transactions')}>View activity</button></div></section></div></BankingShell>
 return <BankingShell><div className="fb-page bill-pay-workspace">
  <header className="fb-heading bill-pay-heading"><div className="fb-heading-actions"><button className="fb-btn" onClick={()=>navigate('/')}><ArrowLeft size={15}/> Account</button><button className="fb-btn" onClick={()=>navigate('/transfers')}>Transfer</button></div><span>PAYMENTS</span><h1>Pay a bill</h1><p>Select a biller, enter the payment details, and continue.</p></header>
  <div className="fb-grid bill-pay-layout">
   <section className="fb-card bill-directory-card">
    <div className="fb-card-head bill-directory-header"><div><h2>Billers</h2><p>{billers.length} billers available</p></div>{showDirectory&&search&&<button className="bill-clear-search" onClick={()=>setSearch('')} aria-label="Clear search"><X size={16}/></button>}</div>
    <label className="fb-field bill-search"><span className="sr-only">Search billers</span><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search billers"/></label>
    <div className="bill-category-filter">{categories.map(item=><button key={item} className={categoryFilter===item?'active':''} onClick={()=>setCategoryFilter(item)}>{item}</button>)}</div>
    <div className="bill-directory-list">{visible.map(b=><button key={b.id} className={`bill-directory-item ${selected?.name===b.name?'selected':''}`} disabled={busy} onClick={()=>void chooseBiller(b)}><span className="bill-icon">{b.name.slice(0,1).toUpperCase()}</span><div><b>{b.name}</b><small>{b.category}</small></div><ChevronRight size={16}/></button>)}</div>
    {visible.length===0&&<div className="fb-empty"><b>No billers found</b><span>Try a different name or category.</span></div>}
   </section>
   <aside className="fb-card bill-payment-card">
    <div className="fb-card-head"><h2>{selected?'Payment details':'Choose a biller'}</h2><p>{selected?.name||'Select a biller from the directory to begin.'}</p></div>
    {showReference&&selected&&!payees.some(p=>p.id===selected.id)?<div className="bill-reference-step"><div className="bill-selected"><span className="bill-icon">{selected.name.slice(0,1).toUpperCase()}</span><div><b>{selected.name}</b><small>{selected.category}</small></div></div><label className="fb-field">Account or reference<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Enter account or reference"/></label><div className="fb-actions"><button className="fb-btn" onClick={()=>{setSelected(null);setShowReference(false);setReference('');setShowDirectory(true)}}>Back</button><button className="fb-btn primary" disabled={busy} onClick={()=>void saveDirectoryPayee()}>{busy?'Saving…':'Continue'} <ChevronRight size={15}/></button></div></div>:selected?<div className="bill-payment-fields"><div className="bill-selected"><span className="bill-icon">{selected.name.slice(0,1).toUpperCase()}</span><div><b>{selected.name}</b><small>{selected.category}{selected.account_reference?` · ${selected.account_reference}`:''}</small></div></div><label className="fb-field">Amount<input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} inputMode="decimal" placeholder="0.00"/></label><label className="fb-field">Payment date<input value={date} min={today} onChange={e=>setDate(e.target.value)} type="date"/></label><button className="fb-btn primary" disabled={busy||!value||value>available} onClick={()=>void pay()}>{busy?'Processing…':date===today?'Pay now':'Schedule payment'} <CalendarDays size={15}/></button></div>:<div className="fb-empty bill-empty-state"><b>Select a biller</b><span>Choose from the available billers to continue.</span></div>}
    {error&&<p className="fb-error">{error}</p>}
   </aside>
  </div>
 </div></BankingShell>
}
