import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage'
import ResetPasswordPage from './ResetPasswordPage'
import { MFAChallenge } from './MFAChallenge'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import FNCUHome from './FNCUHome'
import { TransferCenterV4 } from './TransferCenterV4'
import { CardsCenterV5 } from './CardsCenterV5'
import TransactionsPage from './TransactionsPage'
import MessagesPage from './MessagesPage'
import AdminPage from './AdminPage'
import ProfilePage from './ProfilePage'
import { BeneficiariesPageV2 } from './BeneficiariesPageV2'
import BankingServicesPage from './BankingServicesPage'
import { FNCUWordmark } from './FNCUBrand'
import './styles.css'
import './functional-ui.css'
import './auth.css'
import './fncu-identity.css'
import './ledger-shell.css'
import './card-atm.css'
import './receipt-presentation.css'
import './polish.css'
import './avatar-fix.css'
import './responsive-platform.css'

function useMfaGate(session: any) {
  const [ready, setReady] = useState(false); const [needs, setNeeds] = useState(false)
  useEffect(() => { let active=true; const check=async()=>{ if(!session){setReady(false);setNeeds(false);return}; const{data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel(); if(!active)return; if(error||data.nextLevel!=='aal2'||data.currentLevel==='aal2'){setNeeds(false);setReady(true);return}; const token=sessionStorage.getItem('foxsycu.mfa.recovery.grant');if(token){const{data:grant}=await supabase.rpc('has_mfa_recovery_grant',{p_grant_token:token});if(grant?.valid){setNeeds(false);setReady(true);return}sessionStorage.removeItem('foxsycu.mfa.recovery.grant')}setNeeds(true);setReady(true)};void check();return()=>{active=false}},[session]); return{ready,needs,setNeeds}
}
function Loading(){return <main className="fncu-loading" aria-label="Loading FNCU customer account"><div className="fncu-loading-card"><FNCUWordmark/><div className="fncu-loading-spinner" aria-hidden="true"/><p className="fncu-loading-copy">Loading your customer account…</p><p className="fncu-loading-note">SECURE CUSTOMER ACCESS</p></div></main>}
function ProtectedCustomerApp(){const{session,loading,account,profile}=useCustomerData();const location=useLocation();const gate=useMfaGate(session);if(loading)return <Loading/>;if(!session)return <AuthPage/>;if(!account||!profile)return <Loading/>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;if(location.pathname==='/')return <FNCUHome/>;if(location.pathname==='/transfers')return <TransferCenterV4/>;if(location.pathname==='/transactions')return <TransactionsPage/>;if(location.pathname==='/messages')return <MessagesPage/>;if(location.pathname==='/cards')return <CardsCenterV5/>;if(location.pathname==='/beneficiaries')return <BeneficiariesPageV2/>;if(location.pathname==='/services')return <BankingServicesPage/>;return <FNCUHome/>}
function ProtectedProfile(){const{session,loading,account,profile}=useCustomerData();const gate=useMfaGate(session);if(loading)return <Loading/>;if(!session)return <AuthPage/>;if(!account||!profile)return <Loading/>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;return <ProfilePage/>}
function ProtectedAdmin(){const{session,loading,account}=useCustomerData();const gate=useMfaGate(session);if(loading)return <Loading/>;if(!session)return <AuthPage/>;if(!account)return <Loading/>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;return <AdminPage/>}
function Root(){const location=useLocation();const navigate=useNavigate();useEffect(()=>{if(location.pathname==='/private-banking')navigate('/',{replace:true})},[location.pathname,navigate]);if(location.pathname==='/reset-password')return <ResetPasswordPage/>;if(location.pathname==='/login')return <AuthPage/>;return <CustomerProvider>{location.pathname==='/profile'?<ProtectedProfile/>:location.pathname==='/admin'?<ProtectedAdmin/>:<ProtectedCustomerApp/>}</CustomerProvider>}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Root/></BrowserRouter></StrictMode>)
