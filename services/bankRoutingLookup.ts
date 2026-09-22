export type BankRoutingLookup = { routingNumber: string; bankName: string; city?: string; state?: string }

const normalizeRouting = (value: string) => value.replace(/\D/g, '').slice(0, 9)

export function isValidUsRoutingNumber(value: string) {
  const routing = normalizeRouting(value)
  if (!/^\d{9}$/.test(routing)) return false
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
  return routing.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 10 === 0
}

const knownBanks: Record<string, BankRoutingLookup> = {
  '021000021': { routingNumber: '021000021', bankName: 'JPMorgan Chase Bank, N.A.' },
  '026009593': { routingNumber: '026009593', bankName: 'Bank of America, N.A.' },
  '121000248': { routingNumber: '121000248', bankName: 'Wells Fargo Bank, N.A.' },
}

export async function lookupUsBankByRoutingNumber(value: string, signal?: AbortSignal): Promise<BankRoutingLookup> {
  const routingNumber = normalizeRouting(value)
  if (!/^\d{9}$/.test(routingNumber)) throw new Error('Enter a 9-digit routing number.')
  if (!isValidUsRoutingNumber(routingNumber)) throw new Error('That routing number is not valid. Check the 9 digits and try again.')
  if (knownBanks[routingNumber]) return knownBanks[routingNumber]

  const response = await fetch('https://bankrouting.io/api/v1/aba/' + routingNumber, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    if (response.status === 404) throw new Error('We could not identify a bank for that routing number.')
    if (response.status === 429) throw new Error('Bank lookup is temporarily busy. Please try again in a moment.')
    throw new Error('Bank lookup is temporarily unavailable.')
  }
  const data = await response.json() as { bank_name?: string; name?: string; city?: string; state?: string }
  const bankName = String(data.bank_name || data.name || '').trim()
  if (!bankName) throw new Error('The routing number is valid, but no bank name was returned.')
  return { routingNumber, bankName, city: data.city, state: data.state }
}
