import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import { supabase } from './supabaseClient'
import './feature-banking.css'

export default function TransferPinPage(){
  const navigate=useNavigate()
  const[pinSet,setPinSet]=useState(false)
  const[loading,setLoading]=useState(true)
  const[busy,setBusy]=useState(false)
  const[pin,setPin]=useState('')
  const[confirm,setConfirm]=useState('')
  const[current,setCurrent]=useState('')
  const[message,setMessage]=useState('')
  const[error,setError]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const{data,error:e}=await supabase.functions.invoke('transfer-security',{body:{action:'status'}})
      if(e)throw e
      setPinSet(Boolean(data?.pin_set))
    }catch(e:any){setError(e?.message||'Unable to load Transfer PIN status.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const submit=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setMessage('')
    if(!/^\d{4,6}$/.test(pin)){setError('Transfer PIN must contain 4–6 digits.');setBusy(false);return}
    if(new Set(pin).size<2){setError('Choose a Transfer PIN with more than one distinct digit.');setBusy(false);return}
    if(pin!==confirm){setError('The Transfer PIN confirmation does not match.');setBusy(false);return}
    if(pinSet&&!/^\d{4,6}$/.test(current)){setError('Enter your current Transfer PIN to change it.');setBusy(false);return}
    try{
      const{data,error:e}=await supabase.functions.invoke('transfer-security',{body:{action:'set_pin',pin,confirm_pin:confirm,current_pin:pinSet?current:''}})
      if(e)throw e
      if(data?.error)throw new Error(data.error)
      setPin('');setConfirm('');setCurrent('');setPinSet(true);setMessage(pinSet?'Your Transfer PIN has been changed.':'Your Transfer PIN has been set successfully.')
    }catch(e:any){setError(e?.message||'Unable to save your Transfer PIN.')}finally{setBusy(false)}
  }

  return <BankingShell><div className="fb-page"><header className="fb-heading"><span>PROFILE & SECURITY</span><h1>{pinSet?'Change Transfer PIN':'Set Transfer PIN'}</h1><p>{pinSet?'Update the PIN used to authorize money transfers.':'Create the PIN you will use before requesting a transfer authorization token.'}</p></header>{message&&<div className="fb-success" style={{marginBottom:14}}><CheckCircle2 size={18}/><div><b>{message}</b></div></div>}<section className="fb-card" style={{maxWidth:620}}>{loading?<p>Loading security settings…</p>:<><div className="fb-card-head"><div style={{display:'flex',gap:10,alignItems:'flex-start'}}><ShieldCheck size={20}/><div><h2>Transfer authorization PIN</h2><p>Your PIN is verified server-side and is never shown to FNCU staff.</p></div></div></div><form onSubmit={submit} style={{display:'grid',gap:14}}>{pinSet&&<label className="fb-field">Current Transfer PIN<input value={current} onChange={e=>setCurrent(e.target.value.replace(/\D/g,'').slice(0,6))} type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" placeholder="4–6 digits"/></label>}<label className="fb-field">{pinSet?'New Transfer PIN':'Transfer PIN'}<input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" placeholder="4–6 digits"/></label><label className="fb-field">Confirm Transfer PIN<input value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,'').slice(0,6))} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" placeholder="Re-enter your PIN"/></label><div className="fb-detail"><span>PIN requirements</span><b>4–6 digits<small>Use more than one distinct digit. Do not reuse your account password.</small></b></div><div className="fb-actions"><button type="button" className="fb-btn" onClick={()=>navigate('/profile') }><ArrowLeft size={14}/> Back to profile</button><button type="submit" className="fb-btn primary" disabled={busy}>{busy?'Saving…':pinSet?'Change Transfer PIN':'Set Transfer PIN'} <ShieldCheck size={15}/></button></div>{error&&<p className="fb-error">{error}</p>}</form></>}</section></div></BankingShell>
}
