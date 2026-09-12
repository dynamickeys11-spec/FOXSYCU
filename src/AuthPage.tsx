import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ShieldCheck, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './auth.css'

const AUTH_REDIRECT_URL = window.location.origin + '/login'

type SignUpData = {
  fullName: string
  preferredName: string
  phone: string
  dateOfBirth: string
  addressLine1: string
  city: string
  stateRegion: string
  postalCode: string
  country: string
  occupation: string
  employmentStatus: string
  email: string
  password: string
  acceptTerms: boolean
}

const emptySignUp: SignUpData = {
  fullName: '', preferredName: '', phone: '', dateOfBirth: '', addressLine1: '', city: '', stateRegion: '', postalCode: '', country: 'United States', occupation: '', employmentStatus: '', email: '', password: '', acceptTerms: false,
}

export function AuthPage(){
  const navigate=useNavigate()
  const [mode,setMode]=useState<'sign-in'|'sign-up'>('sign-in')
  const [open,setOpen]=useState(false)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [signUp,setSignUp]=useState<SignUpData>(emptySignUp)
  const [step,setStep]=useState(1)
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const passkeyApi=(supabase.auth as any).signInWithPasskey
  const update=(key:keyof SignUpData,value:string|boolean)=>setSignUp(v=>({...v,[key]:value}))
  const ageValid=useMemo(()=>{if(!signUp.dateOfBirth)return false;const d=new Date(signUp.dateOfBirth);if(Number.isNaN(d.getTime()))return false;const now=new Date();let age=now.getFullYear()-d.getFullYear();const m=now.getMonth()-d.getMonth();if(m<0||(m===0&&now.getDate()<d.getDate()))age--;return age>=18},[signUp.dateOfBirth])
  useEffect(()=>{void supabase.auth.getSession().then(({data})=>{if(data.session)navigate('/',{replace:true})})},[navigate])
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('')
    try{
      if(mode==='sign-in'){
        const result=await supabase.auth.signInWithPassword({email,password});
        if(result.error)throw result.error
        navigate('/',{replace:true});return
      }
      if(step<3){
        if(step===1 && (!signUp.fullName.trim()||!signUp.dateOfBirth||!ageValid)){setMessage('Enter your legal name and a valid date of birth. Customers must be 18 or older.');return}
        if(step===2 && (!signUp.addressLine1.trim()||!signUp.city.trim()||!signUp.country||!signUp.email.trim()||signUp.password.length<10)){setMessage('Complete the contact and login details before continuing.');return}
        setStep(v=>v+1);return
      }
      if(!signUp.acceptTerms){setMessage('Please accept the account terms to continue.');return}
      const result=await supabase.auth.signUp({email:signUp.email.trim(),password:signUp.password,options:{emailRedirectTo:AUTH_REDIRECT_URL,data:{full_name:signUp.fullName.trim(),preferred_name:signUp.preferredName.trim()||null,phone:signUp.phone.trim()||null,date_of_birth:signUp.dateOfBirth||null,address_line1:signUp.addressLine1.trim(),city:signUp.city.trim(),state_region:signUp.stateRegion.trim()||null,postal_code:signUp.postalCode.trim()||null,country:signUp.country,occupation:signUp.occupation.trim()||null,employment_status:signUp.employmentStatus||null}}})
      if(result.error)throw result.error
      if(result.data.session){navigate('/',{replace:true});return}
      setMessage('Your application has been created. Check your email to confirm your address, then sign in to continue.')
    }catch(e){setMessage(e instanceof Error?e.message:'We could not complete your request. Please try again.')}finally{setBusy(false)}
  }
  const passkey=async()=>{setBusy(true);setMessage('');try{const result=await(supabase.auth as any).signInWithPasskey();if(result.error){setMessage(result.error.message);return}navigate('/',{replace:true})}catch(e){setMessage(e instanceof Error?e.message:'Passkey sign-in could not be completed.')}finally{setBusy(false)}}
  const openMode=(next:'sign-in'|'sign-up')=>{setMode(next);setStep(1);setMessage('');setOpen(true)}
  return <main className="welcome">
    <div className="welcome-brand"><div className="brand-mark">F</div><div><b>FOXSYCU</b><small>DIGITAL BANKING SYSTEM</small></div></div>
    <div className="welcome-copy"><h1>Banking<br/>made simple.<br/>Built for you.</h1><p>Secure. Fast. Reliable.</p><p>All your finances, in one place.</p></div>
    <div className="welcome-actions"><button onClick={()=>openMode('sign-up')}>Open an account</button><button className="outline" onClick={()=>openMode('sign-in')}>Sign in</button></div>
    <div className="welcome-secure"><ShieldCheck size={15}/> Your security is our priority</div>
    {open&&<div className="auth-modal"><section className="auth-card-wide">
      <button className="auth-close" onClick={()=>setOpen(false)}><X/></button>
      {mode==='sign-up'&&step>1&&<button type="button" className="auth-back" onClick={()=>setStep(v=>v-1)}><ArrowLeft size={15}/>Back</button>}
      <span className="auth-eyebrow">FOXSYCU CUSTOMER ACCESS</span>
      <h2>{mode==='sign-in'?'Sign in to your account':step===1?'Tell us about yourself':step===2?'Your contact & login details':'Review your application'}</h2>
      {mode==='sign-up'&&<div className="auth-progress"><span className={step>=1?'active':''}>1</span><i/><span className={step>=2?'active':''}>2</span><i/><span className={step>=3?'active':''}>3</span></div>}
      <form onSubmit={submit}>
        {mode==='sign-in'?<>
          <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete="current-password"/></label>
          <button className="auth-submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
        </>:step===1?<>
          <div className="auth-two"><label>Legal full name<input value={signUp.fullName} onChange={e=>update('fullName',e.target.value)} required autoComplete="name" placeholder="Your legal name"/></label><label>Preferred name<input value={signUp.preferredName} onChange={e=>update('preferredName',e.target.value)} autoComplete="given-name" placeholder="Optional"/></label></div>
          <div className="auth-two"><label>Date of birth<input type="date" value={signUp.dateOfBirth} onChange={e=>update('dateOfBirth',e.target.value)} required/></label><label>Mobile phone<input type="tel" value={signUp.phone} onChange={e=>update('phone',e.target.value)} autoComplete="tel" placeholder="+1 555 000 0000"/></label></div>
          <label>Occupation<input value={signUp.occupation} onChange={e=>update('occupation',e.target.value)} autoComplete="organization-title" placeholder="Occupation or profession"/></label>
          <button className="auth-submit" disabled={busy}>Continue</button>
        </>:step===2?<>
          <label>Residential address<input value={signUp.addressLine1} onChange={e=>update('addressLine1',e.target.value)} required autoComplete="street-address" placeholder="Street address"/></label>
          <div className="auth-three"><label>City<input value={signUp.city} onChange={e=>update('city',e.target.value)} required autoComplete="address-level2"/></label><label>State / region<input value={signUp.stateRegion} onChange={e=>update('stateRegion',e.target.value)} autoComplete="address-level1"/></label><label>Postal code<input value={signUp.postalCode} onChange={e=>update('postalCode',e.target.value)} autoComplete="postal-code"/></label></div>
          <div className="auth-two"><label>Country<select value={signUp.country} onChange={e=>update('country',e.target.value)}><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Nigeria</option><option>Other</option></select></label><label>Employment status<select value={signUp.employmentStatus} onChange={e=>update('employmentStatus',e.target.value)}><option value="">Select</option><option>Employed</option><option>Self-employed</option><option>Business owner</option><option>Student</option><option>Retired</option><option>Other</option></select></label></div>
          <label>Email address<input type="email" value={signUp.email} onChange={e=>update('email',e.target.value)} required autoComplete="email"/></label>
          <label>Password<input type="password" value={signUp.password} onChange={e=>update('password',e.target.value)} required minLength={10} autoComplete="new-password" placeholder="At least 10 characters"/></label>
          <button className="auth-submit" disabled={busy}>Review application</button>
        </>:<>
          <div className="auth-review"><div><UserRound size={18}/><span><small>Name</small><b>{signUp.fullName}</b></span></div><div><span><small>Email</small><b>{signUp.email}</b></span></div><div><span><small>Address</small><b>{signUp.addressLine1}, {signUp.city}{signUp.stateRegion?`, ${signUp.stateRegion}`:''}</b></span></div><div><span><small>Country</small><b>{signUp.country}</b></span></div></div>
          <label className="auth-check"><input type="checkbox" checked={signUp.acceptTerms} onChange={e=>update('acceptTerms',e.target.checked)}/><span>I confirm that the information provided is accurate and I agree to the FOXSYCU account terms and privacy notice. This is a simulated banking environment.</span></label>
          <button className="auth-submit" disabled={busy}>{busy?'Creating account…':'Create customer account'}</button>
        </>}
      </form>
      {mode==='sign-in'&&<><div className="auth-divider"><span>OR</span></div><button className="auth-secondary" disabled={busy||!passkeyApi} onClick={()=>void passkey()}>{busy?'Waiting for passkey…':'Sign in with passkey'}</button></>}
      {message&&<div className="auth-message">{message}</div>}
      <button className="auth-switch" onClick={()=>{setMode(mode==='sign-in'?'sign-up':'sign-in');setStep(1);setMessage('')}}>{mode==='sign-in'?'Need an account? Open one':'Already have an account? Sign in'}</button>
    </section></div>}
  </main>
}

export default AuthPage
