import { useState } from 'react'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { supabase } from './supabaseClient'
import AdminNavigation from './AdminNavigation'
import './admin.css'

const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0))

export default function AdminCreateCustomerPage(){
  const [fullName,setFullName]=useState(''); const [email,setEmail]=useState(''); const [phone,setPhone]=useState('')
  const [country,setCountry]=useState('United States'); const [accountName,setAccountName]=useState('USD Savings Account')
  const [openingBalance,setOpeningBalance]=useState(''); const [password,setPassword]=useState(''); const [reference,setReference]=useState('')
  const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState<any>(null)
  const submit=async()=>{
    setError('');setSuccess(null);const amount=Number(openingBalance.replace(/[$,\s]/g,'')||0)
    if(!fullName.trim())return setError('Customer name is required.')
    if(!/^\S+@\S+\.\S+$/.test(email.trim()))return setError('Enter a valid customer email address.')
    if(password.length<10)return setError('Temporary password must be at least 10 characters.')
    if(!Number.isFinite(amount)||amount<0)return setError('Opening balance cannot be negative.')
    setSaving(true)
    const {data,error:e}=await supabase.functions.invoke('admin-create-customer',{body:{full_name:fullName.trim(),email:email.trim().toLowerCase(),phone:phone.trim()||null,country:country.trim()||'United States',account_name:accountName.trim()||'USD Savings Account',opening_balance:amount,password,reference:reference.trim()||null}})
    if(e)setError(e.message||'Customer creation failed.');else if(!data?.ok)setError(String(data?.message||'Customer creation failed.'));else{setSuccess(data);setFullName('');setEmail('');setPhone('');setOpeningBalance('');setPassword('');setReference('')}
    setSaving(false)
  }
  return <main className="admin-shell"><AdminNavigation/><section className="admin-main">
    <header className="admin-header"><div><div className="eyebrow">CUSTOMER ONBOARDING</div><h1>Create customer</h1><p className="admin-header-subtitle">Create the login, customer profile, USD account and opening ledger entry as one controlled onboarding workflow.</p></div></header>
    {error&&<div className="admin-error" role="alert">{error}</div>}
    {success&&<div className="admin-notice"><CheckCircle2 size={18}/><div><strong>Customer created successfully</strong><span>{success.email} · Account ending {success.account_number_last4||'—'} · Final balance {money(success.final_balance)} · {success.history_count||0} historical entries</span></div></div>}
    <div className="admin-grid">
      <section className="admin-panel"><div className="panel-head"><div><h2>Customer details</h2><p className="admin-header-subtitle">These details become the customer's initial FNCU profile.</p></div></div>
        {[['Full name',fullName,setFullName,'Customer legal / display name'],['Email address',email,setEmail,'customer@example.com'],['Phone (optional)',phone,setPhone,'Phone number'],['Country',country,setCountry,'United States'],['Account name',accountName,setAccountName,'USD Savings Account']].map(([label,value,setter,placeholder])=><label className="account-actions" key={String(label)}><span>{label as string}</span><input className="admin-input" value={value as string} onChange={e=>(setter as any)(e.target.value)} placeholder={placeholder as string}/></label>)}
      </section>
      <section className="admin-panel"><div className="panel-head"><div><h2>Account setup</h2><p className="admin-header-subtitle">The opening amount is reconciled through the existing double-entry ledger, with the same five-year synthetic activity pattern used by the FNCU demo account.</p></div></div>
        <label className="account-actions"><span>Opening balance (USD)</span><input className="admin-input" inputMode="decimal" value={openingBalance} onChange={e=>setOpeningBalance(e.target.value)} placeholder="0.00"/></label>
        <label className="account-actions"><span>Temporary password</span><input className="admin-input" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label>
        <label className="account-actions"><span>Internal reference (optional)</span><input className="admin-input" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Onboarding / funding reference"/></label>
        <div className="admin-notice"><strong>LEDGER CONTROL</strong><span>The customer receives the FNCU synthetic 2021–2026 activity pattern. Transaction amounts are scaled and mathematically reconciled so the completed history resolves exactly to the balance you enter. Every generated row and journal entry is marked synthetic/demo data for auditability.</span></div>
        <button className="mini-action" disabled={saving} onClick={()=>void submit()}><UserPlus size={16}/>{saving?'Creating customer…':'Create customer account'}</button>
      </section>
    </div>
  </section></main>
}