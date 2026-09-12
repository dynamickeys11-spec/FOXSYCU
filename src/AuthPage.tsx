import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './auth.css'

const AUTH_REDIRECT_URL = 'https://foxsycu.vercel.app/'

export function AuthPage(){
  const navigate=useNavigate()
  const [mode,setMode]=useState<'sign-in'|'sign-up'>('sign-in')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const [showPassword,setShowPassword]=useState(false)
  const passkeyApi=(supabase.auth as any).signInWithPasskey

  useEffect(()=>{void supabase.auth.getSession().then(({data})=>{if(data.session)navigate('/',{replace:true})})},[navigate])

  const submit=async(e:FormEvent)=>{
    e.preventDefault()
    setBusy(true)
    setMessage('')

    const result=mode==='sign-in'
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password,options:{emailRedirectTo:AUTH_REDIRECT_URL}})

    setBusy(false)
    if(result.error){setMessage(result.error.message);return}
    if(result.data.session){navigate('/',{replace:true});return}
    setMessage('Account created. Check your email for the confirmation link, then return here to sign in.')
  }

  const passkey=async()=>{
    setBusy(true);setMessage('')
    try{
      const result=await(supabase.auth as any).signInWithPasskey()
      if(result.error){setMessage(result.error.message);return}
      navigate('/',{replace:true})
    }catch(e){setMessage(e instanceof Error?e.message:'Passkey sign-in could not be completed.')}finally{setBusy(false)}
  }

  return <main className="auth-page">
    <aside className="auth-brand-panel">
      <div className="auth-brand-top">
        <img src="/fncu-logo-light.svg" alt="FNCU — First National Credit Union"/>
        <span className="demo-badge">DEMO ENVIRONMENT</span>
      </div>
      <div className="auth-brand-content">
        <span className="auth-kicker">PRIVATE FINANCIAL PLATFORM</span>
        <h1>Built around the way you manage money.</h1>
        <p>Secure access to your accounts, savings, transfers and financial records — from one considered banking experience.</p>
        <div className="auth-trust-list">
          <span><CheckCircle2/> Multi-factor security</span>
          <span><CheckCircle2/> Encrypted account access</span>
          <span><CheckCircle2/> Transaction-level activity history</span>
        </div>
      </div>
      <div className="auth-brand-footer">© 2026 FNCU · Simulated financial environment for product demonstration</div>
    </aside>

    <section className="auth-form-panel">
      <div className="auth-form-wrap">
        <div className="mobile-brand">
          <img src="/fncu-logo.svg" alt="FNCU — First National Credit Union"/>
          <span className="demo-badge">DEMO</span>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">{mode==='sign-in'?'SECURE CUSTOMER ACCESS':'CUSTOMER ONBOARDING'}</span>
          <h2>{mode==='sign-in'?'Welcome back.':'Open your FNCU profile.'}</h2>
          <p>{mode==='sign-in'?'Sign in to continue to your financial dashboard.':'Create your secure profile to access the FNCU demo experience.'}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label>
          <label>Password
            <span className="password-field"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==='sign-in'?'current-password':'new-password'} placeholder="Enter your password"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide':'Show'}</button></span>
          </label>
          {mode==='sign-in'&&<div className="auth-options"><label className="remember"><input type="checkbox"/> <span>Remember this device</span></label><button type="button" className="text-button" onClick={()=>setMessage('Password recovery is available through the configured Supabase email flow.')}>Forgot password?</button></div>}
          <button className="auth-submit" disabled={busy}>{busy?'Please wait…':mode==='sign-in'?'Sign in securely':'Create secure profile'}<ArrowRight size={17}/></button>
        </form>

        {mode==='sign-in'&&passkeyApi&&<>
          <div className="auth-divider"><span>OR</span></div>
          <button className="auth-secondary" disabled={busy} onClick={()=>void passkey()}><LockKeyhole size={16}/>{busy?'Waiting…':'Continue with passkey'}</button>
        </>}

        {message&&<div className="auth-message" role="status">{message}</div>}

        <div className="auth-switch-row">
          <span>{mode==='sign-in'?'New to FNCU?':'Already have access?'}</span>
          <button onClick={()=>{setMode(mode==='sign-in'?'sign-up':'sign-in');setMessage('')}}>{mode==='sign-in'?'Create an account':'Sign in instead'}</button>
        </div>

        <div className="auth-security-note"><ShieldCheck size={15}/><span><strong>Protected access.</strong> Never share your password or verification codes with anyone.</span></div>
        <div className="auth-legal">By continuing, you acknowledge this is a simulated financial environment used for product demonstration and testing.</div>
      </div>
    </section>
  </main>
}
