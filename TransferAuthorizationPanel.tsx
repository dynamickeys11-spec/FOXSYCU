import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Clock, ShieldCheck } from 'lucide-react'
import { supabase } from './supabaseClient'
import './feature-banking.css'

type Props={movementId:string;amount:number;reference:string;onComplete:(result:any)=>void;onBack:()=>void}
const money=(n:number)=>`$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const secondsLeft=(iso:string)=>Math.max(0,Math.ceil((new Date(iso).getTime()-Date.now())/1000))
const format=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

export default function TransferAuthorizationPanel({movementId,amount,reference,onComplete,onBack}:Props){
 const[stage,setStage]=useState<'pin'|'token'>('pin');const[pin,setPin]=useState('');const[token,setToken]=useState('');const[expiresAt,setExpiresAt]=useState('');const[remaining,setRemaining]=useState(0);const[busy,setBusy]=useState(false);const[error,setError]=useState('')
 useEffect(()=>{if(!expiresAt)return;const tick=()=>setRemaining(secondsLeft(expiresAt));tick();const id=setInterval(tick,1000);return()=>clearInterval(id)},[expiresAt])
 const requestToken=async()=>{
  if(!/^\d{4,6}$/.test(pin))return setError('Enter your 4–6 digit Transfer PIN.')
  setBusy(true);setError('')
  try{
    const {data,error:e}=await supabase.functions.invoke('transfer-security',{body:{action:'send_token',movement_id:movementId,pin}})
    if(e)throw new Error(data?.error||'We could not request the transfer authorization code. Please try again.')
    if(data?.error)throw new Error(String(data.error))
    if(!data?.expires_at)throw new Error('The transfer authorization request was not created. Please try again.')
    setExpiresAt(data.expires_at);setRemaining(secondsLeft(data.expires_at));setStage('token')
  }catch(e:any){setError(e?.message||'We could not request the transfer authorization code. Please try again.')}
  finally{setBusy(false)}
 }
 const authorize=async()=>{
  if(remaining<=0)return setError('This security code has expired. Request a new one.')
  if(!/^\d{8}$/.test(token))return setError('Enter the 8-digit security code.')
  setBusy(true);setError('')
  try{
    const {data,error:e}=await supabase.functions.invoke('transfer-security',{body:{action:'authorize',movement_id:movementId,pin,token}})
    if(e)throw new Error(data?.error||'We could not authorize this transfer. No transfer was completed.')
    if(data?.error)throw new Error(String(data.error))
    if(!data?.result)throw new Error('The transfer authorization response was incomplete. No transfer was completed.')
    onComplete(data.result)
  }catch(e:any){setError(e?.message||'We could not authorize this transfer. No transfer was completed.')}
  finally{setBusy(false)}
 }
 const resend=()=>{setToken('');setStage('pin');setExpiresAt('');setRemaining(0);setError('')}
 return <section className="fb-card"><div className="fb-card-head"><div style={{display:'flex',alignItems:'center',gap:10}}><ShieldCheck size={20}/><div><h2>Confirm transfer</h2><p>{reference} · {money(amount)}</p></div></div></div>{stage==='pin'?<><label className="fb-field">Transfer PIN<input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" type="password" maxLength={6} autoComplete="off" placeholder="4–6 digits"/></label><div className="fb-actions"><button className="fb-btn" disabled={busy} onClick={onBack}><ArrowLeft size={14}/> Back</button><button className="fb-btn primary" disabled={busy} onClick={()=>void requestToken()}>{busy?'Verifying…':'Continue'} <Check size={15}/></button></div></>:<><div className="fb-card" style={{marginTop:4,background:'rgba(11,94,215,.04)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><span style={{display:'inline-flex',alignItems:'center',gap:7}}><Clock size={16}/> Code expires in</span><strong style={{fontSize:22,fontVariantNumeric:'tabular-nums'}}>{remaining>0?format(remaining):'00:00'}</strong></div></div><label className="fb-field">Security code<input value={token} onChange={e=>setToken(e.target.value.replace(/\D/g,'').slice(0,8))} inputMode="numeric" maxLength={8} autoComplete="one-time-code" placeholder="00000000"/></label>{remaining<=0&&<p className="fb-error">This security code has expired. Request a new one.</p>}<div className="fb-actions"><button className="fb-btn" disabled={busy} onClick={resend}>Request new code</button><button className="fb-btn primary" disabled={busy||remaining<=0} onClick={()=>void authorize()}>{busy?'Authorizing…':'Confirm transfer'} <Check size={15}/></button></div></>}{error&&<p className="fb-error">{error}</p>}</section>
}
