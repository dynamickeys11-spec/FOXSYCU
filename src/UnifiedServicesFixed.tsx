import { BankingShell } from './BankingShell'
import { SecurityCenter, PrivateBanking } from './SecurityPremiumFixed'
import { SettingsPage } from './CoreBankingServices'
import { TransferCenter, SavingsCenter, CardsCenter, BeneficiariesCenter, StatementsCenter, CommunicationCenterV2 } from './FeatureBanking'
import './unified-services.css'

function withShell(Page: React.ComponentType) {
  return function UnifiedServicePage() {
    return <BankingShell><Page /></BankingShell>
  }
}

export const UnifiedSecurityCenter = withShell(SecurityCenter)
export const UnifiedCommunicationCenter = withShell(CommunicationCenterV2)
export const UnifiedPrivateBanking = withShell(PrivateBanking)
export const UnifiedBeneficiaries = withShell(BeneficiariesCenter)
export const UnifiedSavings = withShell(SavingsCenter)
export const UnifiedCards = withShell(CardsCenter)
export const UnifiedStatements = withShell(StatementsCenter)
export const UnifiedSettings = withShell(SettingsPage)
export const UnifiedTransfers = withShell(TransferCenter)
