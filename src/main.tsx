import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import App from './WorldBankingV2'
import { CommunicationCenter, PrivateBanking, SecurityCenter } from './SecurityPremium'
import './styles.css'

function Root() {
  const location = useLocation()
  if (location.pathname === '/security') return <SecurityCenter />
  if (location.pathname === '/communication') return <CommunicationCenter />
  if (location.pathname === '/private-banking') return <PrivateBanking />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
