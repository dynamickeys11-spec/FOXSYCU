import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage'
import ResetPasswordPage from './ResetPasswordPage'
import { MFAChallenge } from './MFAChallenge'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import FNCUHome from './FNCUHome'
import { TransferCenterFixed } from './TransferCenterFixed'
import P2PPaymentPage from './P2PPaymentPage'
import CheckDepositPage from './CheckDepositPage'
import BillPayPage from './BillPayPage'
import { CardsCenterV5 } from './CardsCenterV5'
import TransactionsPage from './TransactionsPage'
import MessagesPage from './MessagesPage'
import AdminPage from './AdminPage'
import ProfilePage from './ProfilePage'
import { BeneficiariesPageV2 } from './BeneficiariesPageV2'
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
import './check-deposit.css'

function useMfaGate(session: any) { const [ready,setReady]=useState(false);const[needs,setNeeds]=useState(false);useEffect(()=>{let active=true;const check=async()=>{if(!session){setReady(false);setNeeds(false);return};const{data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(!active)return;if(error||data.nextLevel!=='aal2'||data.currentLevel==='aal2'){setNeeds(false);setReady(true);return}const token=sessionStorage.getItem('foxsycu.mfa.recovery.grant');if(token){const{data:grant}=await supabase.rpc('has_mfa_recovery_grant',{p_grant_token:token});if(grant?.valid){setNeeds(false);setReady(true);return}sessionStorage.removeItem('foxsycu.mfa.recovery.grant')}setNeeds(true);setReady(true)};void check();return()=>{active=false}},[session]);return{ready,needs,setNeeds}}
function Loading(){return <main className="fncu-loading" aria-label="Loading FNCU customer account"><div className="fncu-loading-card"><FNCUWordmark/><div className="fncu-loading-spinner" aria-hidden="true"/><p className="fncu-loading-copy">Loading your customer account…</p><p className="fncu-loading-note">SECURE CUSTOMER ACCESS</p></div></main>}
function ProtectedCustomerApp(){const{session,loading,account,profile}=useCustomerData();const location=useLocation();const gate=useMfaGate(session);if(loading)return <Loading/>;if(!session)return <AuthPage/>;if(!account||!profile)return <Loading/>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;if(location.pathname==='/')return <FNCUHome/>;if(location.pathname==='/deposit')return <CheckDepositPage/>;if(location.pathname==='/bills')return <BillPayPage/>;if(location.pathname==='/transfers')return location.search.includes('mode=p2p')||location.search.includes('mode=zelle_like')?<P2PPaymentPage/>:<TransferCenterFixed/>;if(location.pathname==='/transactions')return <TransactionsPage/>;if(location.pathname==='/messages')return <MessagesPage/>;if(location.pathname==='/cards')return <CardsCenterV5/>;if(location.pathname==='/beneficiaries')return <BeneficiariesPageV2/>;return <FNCUHome/>}
function ProtectedProfile(){const{session,loading,account,profile}=useCustomerData();const gate=useMfaGate(session);if(loading)return <Loading/>;if(!session)return <AuthPage/>;if(!account||!profile)return <Loading/>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;return <ProfilePage/>}
function ProtectedAdmin(){const{session,loading}=useCustomerData();const gate=useMfaGate(session);const[adminLoading,setAdminLoading]=useState(true);const[allowed,setAllowed]=useState(false);useEffect(()=>{if(loading)return;let active=true;void(async()=>{if(!session){setAdminLoading(false);return}let{data:isAdmin}=await supabase.rpc('is_admin');if(!isAdmin){await supabase.rpc('claim_bootstrap_admin');isAdmin=(await supabase.rpc('is_admin')).data}if(active){setAllowed(Boolean(isAdmin));setAdminLoading(false)}})();return()=>{active=false}},[loading,session]);if(loading||adminLoading)return <Loading/>;if(!session)return <AuthPage/>;if(!allowed)return <main className="admin-denied"><div><div className="admin-lock">FNCU</div><h1>Admin access required</h1><p>Sign in with the authorized administrator account.</p><button onClick={()=>void supabase.auth.signOut()}>Sign out</button></div></main>;if(!gate.ready)return <Loading/>;if(gate.needs)return <MFAChallenge onVerified={()=>gate.setNeeds(false)}/>;return <AdminPage/>}
function Root(){const location=useLocation();const navigate=useNavigate();useEffect(()=>{if(location.pathname==='/private-banking'||location.pathname==='/services')navigate('/',{replace:true})},[location.pathname,navigate]);if(location.pathname==='/reset-password')return <ResetPasswordPage/>;if(location.pathname==='/login')return <AuthPage/>;return <CustomerProvider>{location.pathname==='/profile'?<ProtectedProfile/>:location.pathname==='/admin'?<ProtectedAdmin/>:<ProtectedCustomerApp/>}</CustomerProvider>}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Root/></BrowserRouter></StrictMode>)
