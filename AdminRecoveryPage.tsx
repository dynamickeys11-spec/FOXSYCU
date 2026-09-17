import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AdminNavigation from './AdminNavigation'
import './admin.css'
import './admin-unified-nav.css'

export default function AdminRecoveryPage(){
 const navigate=useNavigate(); const[email,setEmail]=useState(''); const[code,setCode]=useState(''); const[message,setMessage]=useState(''); const[busy,setBusy]=useState(false)
 const issue=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{const{data,error}=await supabase.functions.invoke('direct-account-recovery',{body:{action:'issue',email:email.trim()}});if(error)throw error;if(!data?.ok)throw new Error(data?.message||'Could not issue recovery code');setCode(data.recovery_code);setMessage(`One-time recovery code issued. It expires in ${data.expires_in_minutes} minutes.`)}catch(err){setMessage(err instanceof Error?err.message:'Could not issue recovery code.')}finally{setBusy(false)}}
 return <main className="admin-shell"><AdminNavigation/><section className="admin-main"><header className="admin-header"><div><div className="eyebrow">CUSTOMER ACCESS CONTROL</div><h1>Direct account recovery</h1><p>Issue a one-time recovery code only for accounts whose sole authentication identity is email/password.</p></div></header><div className="admin-notice"><strong>SECURE OPERATION</strong><span>Google and other external-provider accounts are rejected by the backend. Recovery codes expire after 30 minutes and are single-use.</span></div><section className="panel" style={{maxWidth:680}}><form onSubmit={issue} style={{display:'grid',gap:16}}><label>Email address<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required autoComplete="off" placeholder="Customer email"/></label><button className="refresh" type="submit" disabled={busy}>{busy?'Issuing…':'Issue recovery code'}</button></form>{code&&<div className="admin-notice" style={{marginTop:20}}><strong>ONE-TIME CODE</strong><span style={{fontSize:28,fontWeight:800,letterSpacing:6}}>{code}</span><small>Provide this code through your approved support-verification process. It is not emailed automatically.</small></div>}{message&&<div className="admin-error" style={{marginTop:16}}>{message}</div>}</section></section></main>
}
