import { useState } from 'react'
import { ArrowRight, Building2, Plus, Trash2, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import { lookupUsBankByRoutingNumber } from './services/bankRoutingLookup'
import './feature-banking.css'
import './beneficiaries-v2.css'

const last4=(value:string)=>value ? `•••• ${value.slice(-4)}` : '—'

export function BeneficiariesPageV2(){
  const {beneficiaries,refresh}=useCustomerData()
  const navigate=useNavigate()
  const [open,setOpen]=useState(false)
  const [name,setName]=useState('')
  const [accountNumber,setAccountNumber]=useState('')
  const [routingNumber,setRoutingNumber]=useState('')
  const [institution,setInstitution]=useState('')
  const [accountType,setAccountType]=useState('checking')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [bankLookupState,setBankLookupState]=useState<'idle'|'checking'|'verified'|'error'>('idle')
  const [deleting,setDeleting]=useState<string|null>(null)

  const detectBank=async(value:string)=>{setRoutingNumber(value);setInstitution('');setBankLookupState('idle');setError('');if(value.length!==9)return;setBankLookupState('checking');try{const result=await lookupUsBankByRoutingNumber(value);setInstitution(result.bankName);setBankLookupState('verified')}catch(e:any){setBankLookupState('error');setError(e?.message||'Unable to identify the bank from that routing number.')}}

  const add=async()=>{
    const uid=(await supabase.auth.getUser()).data.user?.id
    if(!uid||!name.trim()||!/^\d{12}$/.test(accountNumber)||!/^\d{9}$/.test(routingNumber)||!institution.trim()||bankLookupState!=='verified'){
      setError('Enter the beneficiary name, full 12-digit account number, 9-digit routing number and bank.')
      return
    }
    setBusy(true);setError('')
    const {error:e}=await supabase.from('beneficiaries').insert({user_id:uid,name:name.trim(),account_masked:accountNumber,account_number:accountNumber,routing_number:routingNumber,institution_name:institution.trim(),account_type:accountType,beneficiary_type:'external',status:'active'})
    if(e)setError(e.message)
    else{await refresh();setOpen(false);setName('');setAccountNumber('');setRoutingNumber('');setInstitution('');setAccountType('checking');setBankLookupState('idle')}
    setBusy(false)
  }
  const remove=async(id:string)=>{
    if(!window.confirm('Delete this beneficiary? This does not alter any past transactions.'))return
    setDeleting(id);setError('')
    const {error:e}=await supabase.from('beneficiaries').delete().eq('id',id)
    if(e)setError(e.message);else await refresh()
    setDeleting(null)
  }

  return <BankingShell><div className="fb-page">
    <header className="fb-heading"><span>RECIPIENTS</span><h1>Beneficiaries</h1><p>Manage saved transfer recipients. Sensitive banking details stay protected and are only used when you send money.</p></header>
    <section className="fb-card">
      <div className="fb-card-head"><div><h2>Saved recipients</h2><p>{beneficiaries.length} saved {beneficiaries.length===1?'beneficiary':'beneficiaries'}</p></div><button className="fb-btn primary" onClick={()=>{setError('');setOpen(true)}}><Plus size={15}/>Add beneficiary</button></div>
      <div className="beneficiary-v2-grid">{beneficiaries.map((b:any)=><article className="beneficiary-v2" key={b.id}>
        <div className="beneficiary-v2-top"><span className="beneficiary-v2-icon">{b.beneficiary_type==='business'?<Building2 size={18}/>:<UserRound size={18}/>}</span><span className="beneficiary-v2-status">{b.status||'active'}</span></div>
        <h3>{b.name}</h3><small>{b.institution_name||'External bank'} · {b.account_type||'checking'}</small>
        <div className="beneficiary-v2-detail"><span>Account</span><b>{last4(String(b.account_number||b.account_masked||''))}</b></div>
        <div className="beneficiary-v2-detail"><span>Routing</span><b>{last4(String(b.routing_number||''))}</b></div>
        <div className="beneficiary-v2-actions"><button className="fb-btn primary" onClick={()=>navigate(`/transfers?mode=ach&beneficiary=${encodeURIComponent(b.id)}`)}>Send money <ArrowRight size={14}/></button><button className="fb-btn danger" disabled={deleting===b.id} onClick={()=>void remove(b.id)}><Trash2 size={14}/>{deleting===b.id?'Deleting…':'Delete'}</button></div>
      </article>)}</div>
      {!beneficiaries.length&&<div className="fb-account-preview"><div><span>SAVED RECIPIENTS</span><b>No beneficiaries saved</b><small>Save a recipient once and reuse it for future transfers.</small></div></div>}
      {error&&<p className="fb-error">{error}</p>}
    </section>
    {open&&<div className="fb-modal"><div className="fb-dialog beneficiary-form"><button className="fb-x" onClick={()=>setOpen(false)}><X/></button><span>NEW RECIPIENT</span><h2>Add beneficiary</h2><div className="beneficiary-form-grid"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Recipient name"/></label><label>Bank / institution<input value={institution} readOnly placeholder="Detected from routing number"/><small style={{display:'block',marginTop:6,color:bankLookupState==='error'?'#b42318':'#667085'}}>{bankLookupState==='checking'?'Identifying bank…':bankLookupState==='verified'?'Bank identified from routing number.':'Enter a 9-digit routing number and the bank will be detected automatically.'}</small></label><label>Full account number<input value={accountNumber} onChange={e=>setAccountNumber(e.target.value.replace(/\D/g,'').slice(0,12))} inputMode="numeric" maxLength={12} placeholder="12 digits"/></label><label>Routing number<input value={routingNumber} onChange={e=>void detectBank(e.target.value.replace(/\D/g,'').slice(0,9))} inputMode="numeric" maxLength={9} placeholder="9 digits"/></label><label>Account type<select value={accountType} onChange={e=>setAccountType(e.target.value)}><option value="checking">Checking</option><option value="savings">Savings</option><option value="business checking">Business checking</option></select></label></div>{error&&<p className="fb-error">{error}</p>}<button className="fb-btn primary" disabled={busy} onClick={()=>void add()}>{busy?'Saving…':'Save beneficiary'}</button></div></div>}
  </div></BankingShell>
}
