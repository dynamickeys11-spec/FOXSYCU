import { supabase } from './supabaseClient'

/**
 * U.S. account-verification adapter.
 *
 * FOXSYCU is a synthetic U.S. banking environment. We do not call a Nigerian
 * bank directory or pretend to perform a live external-bank verification.
 * A production integration can replace verifyUSBankAccount() with Plaid,
 * J.P. Morgan, Mastercard, Cybersource, or another approved U.S. provider.
 */
export type BankOption = {
  name: string
  routing_number: string
  active: boolean
}

export type VerifiedBankAccount = {
  verified: boolean
  verification_status: 'verified' | 'pending' | 'invalid'
  account_number: string
  account_name: string | null
  provider: 'synthetic-us-validation'
  routing_number: string
  message: string
}

export type USBankAccountInput = {
  routingNumber: string
  accountNumber: string
  accountType?: 'checking' | 'savings'
  accountHolderName?: string
}

const cleanDigits = (value: string) => value.replace(/\D/g, '')

/** Basic U.S. routing-number validation (ABA checksum). */
export function isValidUSRoutingNumber(value: string) {
  const routing = cleanDigits(value)
  if (routing.length !== 9) return false
  const digits = routing.split('').map(Number)
  const checksum = 3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8])
  return checksum % 10 === 0
}

/** Synthetic routing labels used only by the demo. */
export async function listUSBanks(): Promise<BankOption[]> {
  return [
    { name: 'FOXSYCU Synthetic Test Bank', routing_number: '021000021', active: true },
    { name: 'FOXSYCU Synthetic Savings Test', routing_number: '026009593', active: true },
  ]
}

/**
 * Validate a U.S. routing/account-number pair without claiming live ownership.
 * The result is deliberately marked synthetic so this demo cannot represent
 * format validation as a real external-bank ownership check.
 */
export async function verifyUSBankAccount(input: USBankAccountInput): Promise<VerifiedBankAccount> {
  const routingNumber = cleanDigits(input.routingNumber)
  const accountNumber = cleanDigits(input.accountNumber)
  const accountName = input.accountHolderName?.trim() || null

  if (!isValidUSRoutingNumber(routingNumber)) {
    return { verified: false, verification_status: 'invalid', account_number: accountNumber, account_name: accountName, provider: 'synthetic-us-validation', routing_number: routingNumber, message: 'Enter a valid 9-digit U.S. ABA routing number.' }
  }
  if (accountNumber.length < 4 || accountNumber.length > 17) {
    return { verified: false, verification_status: 'invalid', account_number: accountNumber, account_name: accountName, provider: 'synthetic-us-validation', routing_number: routingNumber, message: 'Enter a valid U.S. account number (4–17 digits).' }
  }

  return { verified: true, verification_status: 'verified', account_number: accountNumber, account_name: accountName, provider: 'synthetic-us-validation', routing_number: routingNumber, message: 'Synthetic U.S. account details passed format validation. No live ownership check was performed.' }
}

export async function resolveUSBankAccount(accountNumber: string, routingNumber: string, accountHolderName?: string) {
  return verifyUSBankAccount({ routingNumber, accountNumber, accountHolderName })
}

export async function saveVerifiedExternalAccount(input: USBankAccountInput) {
  const result = await verifyUSBankAccount(input)
  if (!result.verified) throw new Error(result.message)

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sign in before adding an external account.')

  const { data, error } = await supabase
    .from('external_accounts')
    .insert({
      user_id: auth.user.id,
      institution_name: 'FOXSYCU Synthetic U.S. Bank',
      routing_number: result.routing_number,
      account_number_last4: result.account_number.slice(-4),
      account_name: result.account_name,
      account_type: input.accountType ?? 'checking',
      verification_status: result.verification_status,
      verification_provider: result.provider,
      verified_at: new Date().toISOString(),
      status: 'active',
      metadata: { synthetic: true, provider: result.provider, disclosure: result.message },
    })
    .select('*')
    .single()

  if (error) throw error
  return { ...result, externalAccount: data }
}

/** Deactivate rather than hard-delete a linked account so the relationship remains auditable. */
export async function deactivateExternalAccount(externalAccountId: string) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sign in before removing an external account.')

  const { data, error } = await supabase
    .from('external_accounts')
    .update({ status: 'inactive' })
    .eq('id', externalAccountId)
    .eq('user_id', auth.user.id)
    .select('id,status')
    .single()

  if (error) throw error
  return data
}
