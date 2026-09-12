import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { AuthPage } from './AuthPage'
import { MFAChallenge } from './MFAChallenge'
import { UnifiedCommunicationCenter, UnifiedPrivateBanking, UnifiedBeneficiaries, UnifiedSavings, UnifiedCards, UnifiedStatements, UnifiedSettings, UnifiedTransfers } from './UnifiedServicesFixed'
import { SecurityCenterV2 } from './SecurityCenterV2'
import { OverviewCenter, AccountsCenter, TransactionsCenter } from './CoreBankingViews'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import './styles.css'
import './core-banking.css'
import './security-v2.css'

function ProtectedRoot() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, loading } = useCustomerData()
  const [aalReady, setAalReady] = useState(false)
  const [needsMfa, setNeedsMfa] = useState(false)

  useEffect(() => {
    let active = true
    const check = async () => {
      if (!session) { setAalReady(false); setNeedsMfa(false); return }
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!active) return
      if (error || data.nextLevel !== 'aal2' || data.currentLevel === 'aal2') { setNeedsMfa(false); setAalReady(true); return }
      const grant = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('foxsycu.mfa_recovery_grant') : null
      if (grant) {
        const { data: valid } = await supabase.rpc('has_mfa_recovery_grant', { p_token: grant })
        if (valid === true) { setNeedsMfa(false); setAalReady(true); return }
        sessionStorage.removeItem('foxsycu.mfa_recovery_grant')
      }
      setNeedsMfa(true); setAalReady(true)
    }
    void check()
    return () => { active = false }
  }, [session])

  useEffect(() => { if (!loading && !session) navigate('/login', { replace: true }) }, [loading, session, navigate])
  if (loading || !session || !aalReady) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>Loading FOXSYCU…</main>
  if (needsMfa) return <MFAChallenge onVerified={() => setNeedsMfa(false)} />
  if (location.pathname === '/') return <OverviewCenter />
  if (location.pathname === '/accounts') return <AccountsCenter />
  if (location.pathname === '/transactions') return <TransactionsCenter />
  if (location.pathname === '/security') return <SecurityCenterV2 />
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
