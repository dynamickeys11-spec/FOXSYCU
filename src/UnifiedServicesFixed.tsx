import { BankingShell } from './BankingShell'
import { CommunicationCenter, PrivateBanking, SecurityCenter } from './SecurityPremiumFixed'
import { BeneficiariesPage, SavingsPage, CardsPage, StatementsPage, SettingsPage } from './CoreBankingServices'
import './unified-services.css'

function withShell(Page: React.ComponentType) {
  return function UnifiedServicePage() {
    return <BankingShell><Page /></BankingShell>
  }
}
export const UnifiedSecurityCenter = withShell(SecurityCenter)
export const UnifiedCommunicationCenter = withShell(CommunicationCenter)
export const UnifiedPrivateBanking = withShell(PrivateBanking)
export const UnifiedBeneficiaries = withShell(BeneficiariesPage)
export const UnifiedSavings = withShell(SavingsPage)
export const UnifiedCards = withShell(CardsPage)
export const UnifiedStatements = withShell(StatementsPage)
export const UnifiedSettings = withShell(SettingsPage)
