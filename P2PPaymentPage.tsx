import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import './feature-banking.css'

const DRAFT_KEY='fncu:p2p-payment-draft'

export default function P2PPaymentPage(){
 const {account}=useCustomerData(); const navigate=useNavigate()
 const [recipient,setRecipient]=useState(''); const [email,setEmail]=useState(''); const [amount,setAmount]=useState(''); const [memo,setMemo]=useState(''); const [error,setError]=useState('')
 const value=Number(amount)||0; const available=Number(account?.available_balance||0); const validEmail=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()); const canReview=Boolean(account?.id&&recipient.trim()&&validEmail&&value>0&&value<=available)
 const clearPayment=()=>{setRecipient('');setEmail('');setAmount('');setMemo('');setError('');sessionStorage.removeItem(DRAFT_KEY)}
 const review=()=>{
  if(!canReview){setError(value>available&&value>0?'The payment amount exceeds your available balance.':'Enter a valid recipient name, email, and amount before continuing.');return}
  sessionStorage.setItem(DRAFT_KEY,JSON.stringify({recipient:recipient.trim(),email:email.trim().toLowerCase(),amount:value,memo:memo.trim(),sourceAccountId:account?.id}))
  navigate('/transfers/review')
 }
 return <BankingShell><div className="fb-page"><header className="fb-heading"><span>PAY A PERSON</span><h1>Send money to a person</h1><p>Enter the recipient and payment amount. You will review the details before authorization.</p></header><section className="fb-card"><div className="fb-card-head"><div><h2>Payment details</h2><p>Nothing is submitted until you authorize the payment.</p></div></div><label className="fb-field">Recipient name<input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Full recipient name" autoComplete="name"/></label><label className="fb-field">Recipient email<input type="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="recipient@example.com" autoComplete="email"/></label><label className="fb-field">Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0.00"/></label><label className="fb-field">Memo<input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Optional"/></label><div className="fb-actions"><button className="fb-btn primary" disabled={!canReview} onClick={review}>Review payment <ArrowRight size={15}/></button><button className="fb-btn" type="button" disabled={!recipient&&!email&&!amount&&!memo} onClick={clearPayment}><X size={14}/> Clear</button></div>{error&&<p className="fb-error">{error}</p>}</section></div></BankingShell>
}
