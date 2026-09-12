import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { AuthPage } from './AuthPage'
import { MFAChallenge } from './MFAChallenge'
import { UnifiedCommunicationCenter, UnifiedPrivateBanking, UnifiedSecurityCenter, UnifiedBeneficiaries, UnifiedSavings, UnifiedCards, UnifiedStatements, UnifiedSettings, UnifiedTransfers } from './UnifiedServicesFixed'
import { OverviewCenter, AccountsCenter, TransactionsCenter } from './CoreBankingViews'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import './styles.css'
import './core-banking.css'

function ProtectedRoot() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, loading } = useCustomerData()
  const [aalReady, setAalReady] = useState(false)
  const [needsMfa, setNeedsMfa] = useState(false)
  useEffect(() => {
    let active = true
    if (!session) { setAalReady(false); setNeedsMfa(false); return }
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (!active) return
      if (error) { setAalReady(true); return }
      setNeedsMfa(data.nextLevel === 'aal2' && data.currentLevel !== 'aal2')
      setAalReady(true)
    })
    return () => { active = false }
  }, [session])
  useEffect(() => { if (!loading && !session) navigate('/login', { replace: true }) }, [loading, session, navigate])
  if (loading || !session || !aalReady) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>Loading FOXSYCU…</main>
  if (needsMfa) return <MFAChallenge onVerified={() => setNeedsMfa(false)} />
  if (location.pathname === '/') return <OverviewCenter />
  if (location.pathname === '/accounts') return <AccountsCenter />
  if (location.pathname === '/transactions') return <TransactionsCenter />
  if (location.pathname === '/security') return <UnifiedSecurityCenter />
  if (location.pathname === '/communication') return <UnifiedCommunicationCenter />
  if (location.pathname === '/private-banking') return <UnifiedPrivateBanking />
  if (location.pathname === '/beneficiaries') return <UnifiedBeneficiaries />
  if (location.pathname === '/savings') return <UnifiedSavings />
  if (location.pathname === '/cards') return <UnifiedCards />
  if (location.pathname === '/statements') return <UnifiedStatements />
  if (location.pathname === '/settings') return <UnifiedSettings />
  if (location.pathname === '/transfers') return <UnifiedTransfers />
  return <OverviewCenter />
}

function Root() {
  const location = useLocation()
  if (location.pathname === '/login') return <AuthPage />
  return <CustomerProvider><ProtectedRoot /></CustomerProvider>
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Root /></BrowserRouter></StrictMode>)
