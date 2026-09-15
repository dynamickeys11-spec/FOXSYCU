import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './admin-login.css'

export default function AdminLoginPage(){
 const navigate=useNavigate();
 const[email,setEmail]=useState('katherineadersonss@gmail.com');
 const[password,setPassword]=useState('');
 const[show,setShow]=useState(false);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');const{error:authError}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(authError){setError(authError.message==='Invalid login credentials'?'The administrator email or password is incorrect.':'Unable to sign in. Please check your administrator credentials and try again.');setBusy(false);return}const{data:isAdmin,error:adminError}=await supabase.rpc('is_admin');if(adminError||!isAdmin){await supabase.auth.signOut();setError('This account is not authorized for the FNCU administration portal.');setBusy(false);return}navigate('/admin',{replace:true});setBusy(false)}
 const forgotPassword=async()=>{setError('');const address=email.trim().toLowerCase();if(!address){setError('Enter your administrator email address first.');return}setBusy(true);const{error:resetError}=await supabase.auth.resetPasswordForEmail(address,{redirectTo:`${window.location.origin}/reset-password`});setBusy(false);if(resetError){setError('We could not start the password reset. Please try again.');return}setError('If this administrator account is eligible for recovery, a password-reset email has been requested. Check the administrator mailbox.');}
 return <main className="admin-login-page"><section className="admin-login-panel"><div className="admin-login-brand"><span>F</span><div><strong>FNCU</strong><small>ADMINISTRATION</small></div></div><div className="admin-login-copy"><div className="admin-login-kicker"><ShieldCheck size={15}/> SECURE ADMIN ACCESS</div><h1>Administration portal</h1><p>Sign in with your authorized administrator credentials to access customer operations, deposits, support and audit controls.</p></div><form onSubmit={submit} className="admin-login-form"><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="Administrator email" required/></label><label>Password<div className="admin-password-field"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required/><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label><button type="button" className="admin-forgot-password" onClick={forgotPassword} disabled={busy}>Forgot password?</button>{error&&<div className="admin-login-error" role="alert">{error}</div>}<button className="admin-login-submit" disabled={busy}>{busy?'Signing in…':<>Sign in <ArrowRight size={17}/></>}</button></form><div className="admin-login-footer"><span>FNCU administration</span><button onClick={()=>navigate('/')} type="button">Return to banking</button></div></section></main>
}
