import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage'
import { MFAChallenge } from './MFAChallenge'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import App from './AppLedger'
import './styles.css'
import './functional-ui.css'
import './auth.css'
import './ledger-shell.css'

// FOXSYCU canonical application shell: AppLedger preserves the original banking UI.
function ProtectedRoot(){const {session,loading}=useCustomerData();const [aalReady,setAalReady]=useState(false);const [needsMfa,setNeedsMfa]=useState(false)
useEffect(()=>{let active=true;const check=async()=>{if(!session){setAalReady(false);setNeedsMfa(false);return};const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(!active)return;if(error||data.nextLevel!=='aal2'||data.currentLevel==='aal2'){setNeedsMfa(false);setAalReady(true);return};const recoveryGrant=sessionStorage.getItem('foxsycu.mfa.recovery.grant');if(recoveryGrant){const {data:grant}=await supabase.rpc('has_mfa_recovery_grant',{p_grant_token:recoveryGrant});if(grant?.valid){setNeedsMfa(false);setAalReady(true);return};sessionStorage.removeItem('foxsycu.mfa.recovery.grant')}setNeedsMfa(true);setAalReady(true)};void check();return()=>{active=false}},[session])
if(loading||!session||!aalReady)return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif'}}>Loading FOXSYCU…</main>
if(needsMfa)return <MFAChallenge onVerified={()=>setNeedsMfa(false)}/>
return <App/>}
function Root(){const location=useLocation();const navigate=useNavigate();useEffect(()=>{if(location.pathname==='/private-banking')navigate('/profile',{replace:true})},[location.pathname,navigate]);if(location.pathname==='/login')return <AuthPage/>;return <CustomerProvider><ProtectedRoot/></CustomerProvider>}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Root/></BrowserRouter></StrictMode>)
