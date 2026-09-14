import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage'
import { MFAChallenge } from './MFAChallenge'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import CanonicalLedgerApp from './CanonicalLedgerApp'
import { TransferCenterV3 } from './TransferCenterV3'
import { CardsCenterV5 } from './CardsCenterV5'
import AdminPage from './AdminPage'
import ProfilePage from './ProfilePage'
import './styles.css'
import './functional-ui.css'
import './auth.css'
import './ledger-shell.css'
import './card-atm.css'
import './receipt-presentation.css'
import './polish.css'

function useMfaGate(session: any) {
  const [ready, setReady] = useState(false)
  const [needs, setNeeds] = useState(false)
  useEffect(() => {
    let active = true
    const check = async () => {
      if (!session) { setReady(false); setNeeds(false); return }
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!active) return
      if (error || data.nextLevel !== 'aal2' || data.currentLevel === 'aal2') { setNeeds(false); setReady(true); return }
      const token = sessionStorage.getItem('foxsycu.mfa.recovery.grant')
      if (token) {
        const { data: grant } = await supabase.rpc('has_mfa_recovery_grant', { p_grant_token: token })
        if (grant?.valid) { setNeeds(false); setReady(true); return }
        sessionStorage.removeItem('foxsycu.mfa.recovery.grant')
      }
      setNeeds(true); setReady(true)
    }
    void check()
    return () => { active = false }
  }, [session])
  return { ready, needs, setNeeds }
}

function Loading() {
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter,system-ui,sans-serif' }}>Loading FOXSYCU…</main>
}

function ProtectedCustomerApp() {
  const { session, loading } = useCustomerData()
  const location = useLocation()
  const gate = useMfaGate(session)
  if (loading) return <Loading />
  if (!session) return <AuthPage />
  if (!gate.ready) return <Loading />
  if (gate.needs) return <MFAChallenge onVerified={() => gate.setNeeds(false)} />
  if (location.pathname === '/transfers') return <TransferCenterV3 />
  if (location.pathname === '/cards') return <CardsCenterV5 />
  return <CanonicalLedgerApp />
}

function ProtectedProfile() {
  const { session, loading } = useCustomerData()
  const gate = useMfaGate(session)
  if (loading) return <Loading />
  if (!session) return <AuthPage />
  if (!gate.ready) return <Loading />
  if (gate.needs) return <MFAChallenge onVerified={() => gate.setNeeds(false)} />
  return <ProfilePage />
}

function ProtectedAdmin() {
  const { session, loading } = useCustomerData()
  const gate = useMfaGate(session)
  if (loading) return <Loading />
  if (!session) return <AuthPage />
  if (!gate.ready) return <Loading />
  if (gate.needs) return <MFAChallenge onVerified={() => gate.setNeeds(false)} />
  return <AdminPage />
}

function Root() {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (location.pathname === '/private-banking') navigate('/profile', { replace: true })
  }, [location.pathname, navigate])
  if (location.pathname === '/login') return <AuthPage />
  return (
    <CustomerProvider>
      {location.pathname === '/profile' ? <ProtectedProfile /> : location.pathname === '/admin' ? <ProtectedAdmin /> : <ProtectedCustomerApp />}
    </CustomerProvider>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Root /></BrowserRouter></StrictMode>)
