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

/**
 * Return the small set of synthetic routing numbers used by the demo.
 * These are labels for testing the UI, not a directory of real institutions.
 */
export async function listUSBanks(): Promise<BankOption[]> {
  return [
    { name: 'FOXSYCU Synthetic Test Bank', routing_number: '021000021', active: true },
    { name: 'FOXSYCU Synthetic Savings Test', routing_number: '026009593', active: true },
  ]
}

/**
 * Validate a U.S. routing/account-number pair without claiming live ownership.
 * The result is deliberately marked synthetic so the UI cannot represent this
 * demo check as a real bank-account verification.
 */
export async function verifyUSBankAccount(input: USBankAccountInput): Promise<VerifiedBankAccount> {
  const routingNumber = cleanDigits(input.routingNumber)
  const accountNumber = cleanDigits(input.accountNumber)
  const accountName = input.accountHolderName?.trim() || null

  if (!isValidUSRoutingNumber(routingNumber)) {
    return {
      verified: false,
      verification_status: 'invalid',
      account_number: accountNumber,
      account_name: accountName,
      provider: 'synthetic-us-validation',
      routing_number: routingNumber,
      message: 'Enter a valid 9-digit U.S. ABA routing number.',
    }
  }

  if (accountNumber.length < 4 || accountNumber.length > 17) {
    return {
      verified: false,
      verification_status: 'invalid',
      account_number: accountNumber,
      account_name: accountName,
      provider: 'synthetic-us-validation',
      routing_number: routingNumber,
      message: 'Enter a valid U.S. account number (4–17 digits).',
    }
  }

  return {
    verified: true,
    verification_status: 'verified',
    account_number: accountNumber,
    account_name: accountName,
    provider: 'synthetic-us-validation',
    routing_number: routingNumber,
    message: 'Synthetic U.S. account details passed format validation. No live ownership check was performed.',
  }
}

/** Backwards-compatible name for any unfinished UI code; now U.S.-oriented. */
export async function resolveUSBankAccount(accountNumber: string, routingNumber: string, accountHolderName?: string) {
  return verifyUSBankAccount({ routingNumber, accountNumber, accountHolderName })
}

/** Persist a verified synthetic external account when the caller is signed in. */
export async function saveVerifiedExternalAccount(input: USBankAccountInput) {
  const result = await verifyUSBankAccount(input)
  if (!result.verified) throw new Error(result.message)

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Sign in before adding an external account.')

  const { data, error } = await supabase
    .from('external_accounts')
    .insert({
      user_id: auth.user.id,
      institution_name: 'Synthetic U.S. bank account',
      account_type: input.accountType ?? 'checking',
      account_masked: `••••${result.account_number.slice(-4)}`,
      routing_number_last4: result.routing_number.slice(-4),
      account_number_last4: result.account_number.slice(-4),
      holder_name: result.account_name,
      verification_status: result.verification_status,
      metadata: { synthetic: true, provider: result.provider },
    })
    .select('*')
    .single()

  if (error) throw error
  return { ...result, externalAccount: data }
}
