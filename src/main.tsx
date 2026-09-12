import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage'
import { MFAChallenge } from './MFAChallenge'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import App from './AppLedger'
import ProfilePage from './ProfilePage'
import './styles.css'
import './functional-ui.css'
import './auth.css'
import './ledger-shell.css'

function useMfaGate(session:any){const[ready,setReady]=useState(false);const[needs,setNeeds]=useState(false);useEffect(()=>{let active=true;const check=async()=>{if(!session){setReady(false);setNeeds(false);return}const{data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(!active)return;if(error||data.nextLevel!=='aal2'||data.currentLevel==='aal2'){setNeeds(false);setReady(true);return}const token=sessionStorage.getItem('foxsycu.mfa.recovery.grant');if(token){const{data:grant}=await supabase.rpc('has_mfa_recovery_grant',{p_grant_token:token});if(grant?.valid){setNeeds(false);setReady(true);return}sessionStorage.removeItem('foxsycu.mfa.recovery.grant')}setNeeds(true);setReady(true)};void check();return()=>{active=false}},[session]);return{ready,needs,setNeeds}}

function useLegacyControlBridge(){const navigate=useNavigate();useEffect(()=>{const onClick=(event:MouseEvent)=>{const target=event.target as HTMLElement|null;const button=target?.closest('button') as HTMLButtonElement|null;if(!button)return;if(button.classList.contains('signout')){event.preventDefault();void supabase.auth.signOut();return}
    const menu=button.closest('.account-menu') as HTMLElement|null
    if(menu){const text=button.textContent||'';navigate(/Savings/i.test(text)?'/savings':'/accounts');return}
    const text=(button.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()
    if(text==='replace card'){event.preventDefault();navigate('/support?topic=replace-card');return}
    if(text==='card controls'){event.preventDefault();navigate('/settings?section=cards');return}
    if(text==='report card'){event.preventDefault();navigate('/support?topic=report-card');return}
    if(text==='report a problem'){event.preventDefault();navigate('/support?topic=transaction');return}
    if(text==='add beneficiary'){event.preventDefault();navigate('/beneficiaries?new=1');return}
    if(text==='new message'){event.preventDefault();navigate('/messages?compose=1');return}
    if(text==='more filters'){event.preventDefault();navigate('/transactions?filters=more');return}
  };document.addEventListener('click',onClick);return()=>document.removeEventListener('click',onClick)},[navigate])}

function Loading(){return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif'}}>Loading FOXSYCU…</main>}
function ProtectedRoot(){const{session,loading}=useCustomerData();useLegacyControlBridge();const gate=useMfaGate(session);if(loading)return <Loading/>;if(!session)return <AuthPage/>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;return <App/>}
function ProtectedProfile(){const{session,loading}=useCustomerData();const gate=useMfaGate(session);if(loading)return <Loading/>;if(!session)return <AuthPage/>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;return <ProfilePage/>}
function Root(){const location=useLocation();const navigate=useNavigate();useEffect(()=>{if(location.pathname==='/private-banking')navigate('/profile',{replace:true})},[location.pathname,navigate]);if(location.pathname==='/login')return <AuthPage/>;return <CustomerProvider>{location.pathname==='/profile'?<ProtectedProfile/>:<ProtectedRoot/>}</CustomerProvider>}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Root/></BrowserRouter></StrictMode>)
