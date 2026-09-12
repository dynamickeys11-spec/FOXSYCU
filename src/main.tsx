import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import App from './WorldBankingV2'
import { CommunicationCenter, PrivateBanking, SecurityCenter } from './SecurityPremium'
import { BeneficiariesPage, SavingsPage, CardsPage, StatementsPage, SettingsPage } from './CoreBankingServices'
import './styles.css'

function Root() {
  const location = useLocation()
  if (location.pathname === '/security') return <SecurityCenter />
  if (location.pathname === '/communication') return <CommunicationCenter />
  if (location.pathname === '/private-banking') return <PrivateBanking />
  if (location.pathname === '/beneficiaries') return <BeneficiariesPage />
  if (location.pathname === '/savings') return <SavingsPage />
  if (location.pathname === '/cards') return <CardsPage />
  if (location.pathname === '/statements') return <StatementsPage />
  if (location.pathname === '/settings') return <SettingsPage />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
