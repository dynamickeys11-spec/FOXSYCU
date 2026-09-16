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
  if(!canReview){setError(value>available&&value>0?'The payment amount exceeds your available balance.':'Enter a valid recipient name, recipient email, and amount before continuing.');return}
  sessionStorage.setItem(DRAFT_KEY,JSON.stringify({recipient:recipient.trim(),email:email.trim().toLowerCase(),amount:value,memo:memo.trim(),sourceAccountId:account?.id}))
  navigate('/transfers/review')
 }
 return <BankingShell><div className="fb-page"><header className="fb-heading"><span>PAY A PERSON</span><h1>P2P payment</h1><p>Send USD to a person using the FNCU peer-to-peer payment workflow. Review the payment on the next page before authorization.</p></header><section className="fb-card"><div className="fb-card-head"><div><h2>Recipient</h2><p>Enter the payment details. Nothing is submitted on this page.</p></div></div><label className="fb-field">Recipient name<input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Full recipient name" autoComplete="name"/></label><label className="fb-field">Recipient email<input type="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="recipient@example.com" autoComplete="email"/></label><label className="fb-field">Amount<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0.00"/></label><label className="fb-field">Memo<input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Optional memo"/></label><div className="fb-actions"><button className="fb-btn primary" disabled={!canReview} onClick={review}>Continue to payment summary <ArrowRight size={15}/></button><button className="fb-btn" type="button" disabled={!recipient&&!email&&!amount&&!memo} onClick={clearPayment}><X size={14}/> Clear payment</button></div>{error&&<p className="fb-error">{error}</p>}</section><section className="fb-card"><div className="fb-card-head"><div><h2>Before you continue</h2><p>The next screen will show the sending account, recipient, amount, memo, and remaining available balance. You will then explicitly authorize the payment.</p></div></div><div className="fb-empty">No payment is created until you authorize it on the payment summary page.</div></section></div></BankingShell>
}
