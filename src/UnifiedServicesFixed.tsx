import { BankingShell } from './BankingShell'
import { SecurityCenter, PrivateBanking } from './SecurityPremiumFixed'
import { SettingsPage } from './CoreBankingServices'
import { TransferCenterV3 } from './TransferCenterV3'
import { SavingsCenter, BeneficiariesCenter, CommunicationCenterV2 } from './FeatureBanking'
import { CardsCenterV5 } from './CardsCenterV5'
import { StatementsCenterV3 } from './StatementsCenterV3'
import './unified-services.css'
function withShell(Page: React.ComponentType) { return function UnifiedServicePage(){ return <BankingShell><Page /></BankingShell> } }
export const UnifiedSecurityCenter=withShell(SecurityCenter)
export const UnifiedCommunicationCenter=CommunicationCenterV2
export const UnifiedPrivateBanking=withShell(PrivateBanking)
export const UnifiedBeneficiaries=BeneficiariesCenter
export const UnifiedSavings=SavingsCenter
export const UnifiedCards=CardsCenterV5
export const UnifiedStatements=StatementsCenterV3
export const UnifiedSettings=withShell(SettingsPage)
export const UnifiedTransfers=TransferCenterV3
