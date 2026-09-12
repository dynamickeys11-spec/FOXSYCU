import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import App from './WorldBankingV2'
import { AuthPage } from './AuthPage'
import {
  UnifiedCommunicationCenter,
  UnifiedPrivateBanking,
  UnifiedSecurityCenter,
  UnifiedBeneficiaries,
  UnifiedSavings,
  UnifiedCards,
  UnifiedStatements,
  UnifiedSettings,
} from './UnifiedServicesFixed'
import { CustomerProvider, useCustomerData } from './CustomerProvider'
import './styles.css'

function ProtectedRoot() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, loading } = useCustomerData()

  useEffect(() => {
    if (!loading && !session) navigate('/login', { replace: true })
  }, [loading, session, navigate])

  if (loading || !session) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>Loading FOXSYCU…</main>
  if (location.pathname === '/security') return <UnifiedSecurityCenter />
  if (location.pathname === '/communication') return <UnifiedCommunicationCenter />
  if (location.pathname === '/private-banking') return <UnifiedPrivateBanking />
  if (location.pathname === '/beneficiaries') return <UnifiedBeneficiaries />
  if (location.pathname === '/savings') return <UnifiedSavings />
  if (location.pathname === '/cards') return <UnifiedCards />
  if (location.pathname === '/statements') return <UnifiedStatements />
  if (location.pathname === '/settings') return <UnifiedSettings />
  return <App />
}

function Root() {
  const location = useLocation()
  if (location.pathname === '/login') return <AuthPage />
  return <CustomerProvider><ProtectedRoot /></CustomerProvider>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
