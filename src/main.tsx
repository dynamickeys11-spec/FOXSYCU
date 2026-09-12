import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import App from './WorldBankingV2'
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
import './styles.css'

function Root() {
  const location = useLocation()
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
