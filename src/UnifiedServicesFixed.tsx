import { BankingShell } from './BankingShell'
import { SecurityCenter } from './SecurityPremiumFixed'
import { BeneficiariesPage, SavingsPage, SettingsPage } from './CoreBankingServices'
import { TransferCenterV3 } from './TransferCenterV3'
import { CommunicationCenterV2 } from './FeatureBanking'
import { CardsCenterV5 } from './CardsCenterV5'
import { StatementsCenterV3 } from './StatementsCenterV3'
import './unified-services.css'

function withShell(Page: React.ComponentType) { return function UnifiedServicePage(){ return <BankingShell><Page /></BankingShell> } }

export const UnifiedSecurityCenter = withShell(SecurityCenter)
export const UnifiedCommunicationCenter = CommunicationCenterV2
export const UnifiedPrivateBanking = withShell(PrivateBankingPlaceholder)
export const UnifiedBeneficiaries = withShell(BeneficiariesPage)
export const UnifiedSavings = withShell(SavingsPage)
export const UnifiedCards = CardsCenterV5
export const UnifiedStatements = StatementsCenterV3
export const UnifiedSettings = withShell(SettingsPage)
export const UnifiedTransfers = TransferCenterV3

function PrivateBankingPlaceholder() {
  return <div className="core-page"><div className="core-heading"><div><span>PRIVATE BANKING</span><h1>Private Banking</h1><p>Relationship services are being consolidated into the canonical banking shell.</p></div></div></div>
}
