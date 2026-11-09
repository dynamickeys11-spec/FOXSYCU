import { useState } from 'react'
import { CheckCircle2, UserPlus } from 'lucide-react'
import { supabase } from './supabaseClient'
import AdminNavigation from './AdminNavigation'
import './admin.css'

const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v||0))
const CREDIT_TYPES=['Deposit','Cash Deposit','ACH Credit','Wire Transfer','Direct Deposit','Account Funding','Other']

export default function AdminCreateCustomerPageV2(){
  const [fullName,setFullName]=useState(''); const [email,setEmail]=useState(''); const [phone,setPhone]=useState('')
  const [country,setCountry]=useState('United States'); const [accountName,setAccountName]=useState('USD Savings Account'); const [accountType,setAccountType]=useState('checking')
  const [password,setPassword]=useState(''); const [creditEnabled,setCreditEnabled]=useState(false)
  const [creditAmount,setCreditAmount]=useState(''); const [creditDate,setCreditDate]=useState(''); const [creditTime,setCreditTime]=useState('')
  const [transactionType,setTransactionType]=useState('Deposit'); const [reference,setReference]=useState(''); const [description,setDescription]=useState(''); const [memo,setMemo]=useState('')
  const [senderName,setSenderName]=useState(''); const [senderAccount,setSenderAccount]=useState(''); const [senderBank,setSenderBank]=useState(''); const [routingNumber,setRoutingNumber]=useState('')
  const [effectiveDate,setEffectiveDate]=useState(''); const [postingDate,setPostingDate]=useState(''); const [internalNote,setInternalNote]=useState('')
  const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [success,setSuccess]=useState<any>(null)

  const submit=async()=>{
    setError('');setSuccess(null)
    if(!fullName.trim())return setError('Customer legal name is required.')
    if(!/^\S+@\S+\.\S+$/.test(email.trim()))return setError('Enter a valid customer email address.')
    if(password.length<10)return setError('Temporary password must be at least 10 characters.')
    let amount=0
    if(creditEnabled){amount=Number(creditAmount.replace(/[$,\s]/g,'')||0);if(!Number.isFinite(amount)||amount<=0)return setError('Enter a valid initial credit amount or turn off Initial credit.')}
    setSaving(true)
    const credit_details=creditEnabled?{amount,credit_date:creditDate||null,credit_time:creditTime||null,transaction_type:transactionType,reference:reference.trim()||null,description:description.trim()||null,memo:memo.trim()||null,sender_name:senderName.trim()||null,sender_account:senderAccount.trim()||null,sender_bank:senderBank.trim()||null,routing_number:routingNumber.trim()||null,effective_date:effectiveDate||null,posting_date:postingDate||null,internal_note:internalNote.trim()||null}:{}
    const {data,error:e}=await supabase.functions.invoke('admin-create-customer',{body:{full_name:fullName.trim(),email:email.trim().toLowerCase(),phone:phone.trim()||null,country:country.trim()||'United States',account_name:accountName.trim()||'USD Savings Account',account_type:accountType,password,credit_details}})
    if(e)setError(e.message||'Customer creation failed.')
    else if(data?.ok===false)setError(String(data?.message||'Customer creation failed.'))
    else if(!data)setError('Customer creation failed: the server returned no customer record.')
    else{setSuccess(data);setFullName('');setEmail('');setPhone('');setPassword('');setCreditEnabled(false);setCreditAmount('');setCreditDate('');setCreditTime('');setReference('');setDescription('');setMemo('');setSenderName('');setSenderAccount('');setSenderBank('');setRoutingNumber('');setEffectiveDate('');setPostingDate('');setInternalNote('')}
    setSaving(false)
  }

  return <main className="admin-shell"><AdminNavigation/><section className="admin-main">
    <header className="admin-header"><div><div className="eyebrow">CUSTOMER ONBOARDING</div><h1>Create customer</h1><p className="admin-header-subtitle">Create the login, customer profile and USD account in one controlled onboarding workflow. New accounts start with no prior transaction history.</p></div></header>
    {error&&<div className="admin-error" role="alert">{error}</div>}
    {success&&<div className="admin-notice"><CheckCircle2 size={18}/><div><strong>Customer created successfully</strong><span>{success.email} · Account ending {success.account_number_last4||'—'} · Final balance {money(success.final_balance)} · {success.history_count||0} transaction(s)</span></div></div>}
    <div className="admin-grid">
      <section className="admin-panel"><div className="panel-head"><div><h2>Customer details</h2><p className="admin-header-subtitle">Only the customer's legal name, email and temporary password are required. Other profile fields can be completed when available.</p></div></div>
        <label className="account-actions"><span>Full legal name *</span><input className="admin-input" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Customer legal name"/></label>
        <label className="account-actions"><span>Email address *</span><input className="admin-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="customer@example.com"/></label>
        <label className="account-actions"><span>Phone (optional)</span><input className="admin-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number"/></label>
        <label className="account-actions"><span>Country (optional)</span><input className="admin-input" value={country} onChange={e=>setCountry(e.target.value)} placeholder="United States"/></label>
        <label className="account-actions"><span>Account type *</span><select className="admin-input" value={accountType} onChange={e=>setAccountType(e.target.value)}><option value="checking">Checking</option><option value="savings">Savings</option></select></label>
        <label className="account-actions"><span>Account name (optional)</span><input className="admin-input" value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="USD Savings Account"/></label>
        <label className="account-actions"><span>Temporary password *</span><input className="admin-input" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label>
      </section>
      <section className="admin-panel"><div className="panel-head"><div><h2>Initial credit</h2><p className="admin-header-subtitle">Optional. Leave disabled for a new account with a $0 balance and zero transactions. Enable it only when there is an actual credit to record.</p></div></div>
        <label className="account-actions"><span>Credit the account at creation</span><input type="checkbox" checked={creditEnabled} onChange={e=>setCreditEnabled(e.target.checked)}/></label>
        {creditEnabled&&<div>
          <div className="admin-notice"><strong>ACCOUNT CREDIT</strong><span>Enter only the information that is actually available. Unavailable fields may remain blank. The customer-facing transaction will use the recorded transaction type, reference and description rather than a generic opening-balance label.</span></div>
          <label className="account-actions"><span>Amount (USD) *</span><input className="admin-input" inputMode="decimal" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)} placeholder="0.00"/></label>
          <label className="account-actions"><span>Transaction type</span><select className="admin-input" value={transactionType} onChange={e=>setTransactionType(e.target.value)}>{CREDIT_TYPES.map(type=><option key={type}>{type}</option>)}</select></label>
          <label className="account-actions"><span>Reference / transaction ID</span><input className="admin-input" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Bank reference or transaction ID"/></label>
          <label className="account-actions"><span>Description</span><input className="admin-input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Customer-facing transaction description"/></label>
          <label className="account-actions"><span>Memo</span><input className="admin-input" value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Transaction memo"/></label>
          <div className="admin-grid">
            <label className="account-actions"><span>Credit date</span><input className="admin-input" type="date" value={creditDate} onChange={e=>setCreditDate(e.target.value)}/></label>
            <label className="account-actions"><span>Credit time</span><input className="admin-input" type="time" value={creditTime} onChange={e=>setCreditTime(e.target.value)}/></label>
            <label className="account-actions"><span>Effective date</span><input className="admin-input" type="date" value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/></label>
            <label className="account-actions"><span>Posting date</span><input className="admin-input" type="date" value={postingDate} onChange={e=>setPostingDate(e.target.value)}/></label>
          </div>
          <h3>Originating party</h3>
          <label className="account-actions"><span>Sender / originating party</span><input className="admin-input" value={senderName} onChange={e=>setSenderName(e.target.value)} placeholder="Name of sender or originating party"/></label>
          <label className="account-actions"><span>Sender account</span><input className="admin-input" value={senderAccount} onChange={e=>setSenderAccount(e.target.value)} placeholder="Account number or identifier"/></label>
          <label className="account-actions"><span>Sender bank / institution</span><input className="admin-input" value={senderBank} onChange={e=>setSenderBank(e.target.value)} placeholder="Bank or financial institution"/></label>
          <label className="account-actions"><span>Routing number</span><input className="admin-input" inputMode="numeric" value={routingNumber} onChange={e=>setRoutingNumber(e.target.value)} placeholder="Routing number"/></label>
          <label className="account-actions"><span>Internal admin note</span><textarea className="admin-input" rows={3} value={internalNote} onChange={e=>setInternalNote(e.target.value)} placeholder="Internal note; not shown as customer transaction text"/></label>
        </div>}
        <button className="mini-action" disabled={saving} onClick={()=>void submit()}><UserPlus size={16}/>{saving?'Creating customer…':'Create customer account'}</button>
      </section>
    </div>
  </section></main>
}