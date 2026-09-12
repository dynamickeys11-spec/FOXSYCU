import { FormEvent, useEffect, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './auth.css'

const AUTH_REDIRECT_URL = 'https://foxsycu.vercel.app/'

export function AuthPage(){
  const navigate=useNavigate()
  const [mode,setMode]=useState<'sign-in'|'sign-up'>('sign-in')
  const [open,setOpen]=useState(false)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const passkeyApi=(supabase.auth as any).signInWithPasskey
  useEffect(()=>{void supabase.auth.getSession().then(({data})=>{if(data.session)navigate('/',{replace:true})})},[navigate])
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');const result=mode==='sign-in'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{emailRedirectTo:AUTH_REDIRECT_URL}});setBusy(false);if(result.error){setMessage(result.error.message);return}if(result.data.session){navigate('/',{replace:true});return}setMessage('Account created. Check your email for the confirmation link, then return here to sign in.')}
  const passkey=async()=>{setBusy(true);setMessage('');try{const result=await(supabase.auth as any).signInWithPasskey();if(result.error){setMessage(result.error.message);return}navigate('/',{replace:true})}catch(e){setMessage(e instanceof Error?e.message:'Passkey sign-in could not be completed.')}finally{setBusy(false)}}
  return <main className="welcome"><div className="welcome-brand"><div className="brand-mark">F</div><div><b>FOXSYCU</b><small>DIGITAL BANKING SYSTEM</small></div></div><div className="welcome-copy"><h1>Banking<br/>made simple.<br/>Built for you.</h1><p>Secure. Fast. Reliable.</p><p>All your finances, in one place.</p></div><div className="welcome-actions"><button onClick={()=>{setMode('sign-up');setOpen(true)}}>Create account</button><button className="outline" onClick={()=>{setMode('sign-in');setOpen(true)}}>Sign in</button></div><div className="welcome-secure"><ShieldCheck size={15}/> Your security is our priority</div>{open&&<div className="auth-modal"><section><button className="auth-close" onClick={()=>setOpen(false)}><X/></button><span className="auth-eyebrow">FOXSYCU CUSTOMER ACCESS</span><h2>{mode==='sign-in'?'Sign in to your account':'Create your customer account'}</h2><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==='sign-in'?'current-password':'new-password'}/></label><button className="auth-submit" disabled={busy}>{busy?'Working…':mode==='sign-in'?'Sign in':'Create account'}</button></form>{mode==='sign-in'&&<><div className="auth-divider"><span>OR</span></div><button className="auth-secondary" disabled={busy||!passkeyApi} onClick={()=>void passkey()}>{busy?'Waiting for passkey…':'Sign in with passkey'}</button></>}{message&&<div className="auth-message">{message}</div>}<button className="auth-switch" onClick={()=>{setMode(mode==='sign-in'?'sign-up':'sign-in');setMessage('')}}>{mode==='sign-in'?'Need an account? Create one':'Already have an account? Sign in'}</button></section></div>}</main>
}

export default AuthPage
