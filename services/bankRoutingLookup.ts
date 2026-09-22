export type BankRoutingLookup = {
  routingNumber: string
  bankName: string
  city?: string
  state?: string
  source?: 'fncu-record' | 'directory'
}

type KnownBankRecord = {
  routing_number?: string | null
  routingNumber?: string | null
  institution_name?: string | null
  bank_name?: string | null
  bankName?: string | null
  city?: string | null
  state?: string | null
}

const normalizeRouting = (value: string) => value.replace(/\D/g, '').slice(0, 9)

export function isValidUsRoutingNumber(value: string) {
  const routing = normalizeRouting(value)
  if (!/^\d{9}$/.test(routing)) return false
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
  let total = 0
  for (let index = 0; index < routing.length; index += 1) {
    total += Number(routing[index]) * weights[index]
  }
  return total % 10 === 0
}

const findKnownBank = (routingNumber: string, records: KnownBankRecord[] = []): BankRoutingLookup | null => {
  const match = records.find(record => normalizeRouting(String(record.routing_number || record.routingNumber || '')) === routingNumber)
  const bankName = String(match?.institution_name || match?.bank_name || match?.bankName || '').trim()
  if (!match || !bankName) return null
  return { routingNumber, bankName, city: match.city || undefined, state: match.state || undefined, source: 'fncu-record' }
}

export async function lookupUsBankByRoutingNumber(value: string, signal?: any, knownRecords: KnownBankRecord[] = []): Promise<BankRoutingLookup> {
  const routingNumber = normalizeRouting(value)
  if (!/^\d{9}$/.test(routingNumber)) throw new Error('Enter a 9-digit routing number.')
  if (!isValidUsRoutingNumber(routingNumber)) throw new Error('That routing number is not valid. Check the 9 digits and try again.')

  const known = findKnownBank(routingNumber, knownRecords)
  if (known) return known

  const response = await fetch('https://bankrouting.io/api/v1/aba/' + routingNumber, signal ? { signal, headers: { Accept: 'application/json' } } : { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    if (response.status === 404) throw new Error('We could not identify a bank for that routing number.')
    if (response.status === 429) throw new Error('Bank lookup is temporarily busy. Please try again in a moment.')
    throw new Error('Bank lookup is temporarily unavailable.')
  }

  const data = await response.json() as any
  const bankName = String(data?.bank_name || data?.name || '').trim()
  if (!bankName) throw new Error('The routing number is valid, but no bank name was returned.')
  return { routingNumber, bankName, city: data?.city, state: data?.state, source: 'directory' }
}
