import { BankingShell } from './BankingShell'
import { SecurityCenter, PrivateBanking } from './SecurityPremiumFixed'
import { SettingsPage } from './CoreBankingServices'
import { TransferCenterV3 } from './TransferCenterV3'
import { SavingsCenter, CardsCenter, BeneficiariesCenter, StatementsCenter, CommunicationCenterV2 } from './FeatureBanking'
import './unified-services.css'

function withShell(Page: React.ComponentType) {
  return function UnifiedServicePage() {
    return <BankingShell><Page /></BankingShell>
  }
}

export const UnifiedSecurityCenter = withShell(SecurityCenter)
export const UnifiedCommunicationCenter = CommunicationCenterV2
export const UnifiedPrivateBanking = withShell(PrivateBanking)
export const UnifiedBeneficiaries = BeneficiariesCenter
export const UnifiedSavings = SavingsCenter
export const UnifiedCards = CardsCenter
export const UnifiedStatements = StatementsCenter
export const UnifiedSettings = withShell(SettingsPage)
// Build 2: transfers are routed exclusively through the money-movement service boundary.
export const UnifiedTransfers = TransferCenterV3
