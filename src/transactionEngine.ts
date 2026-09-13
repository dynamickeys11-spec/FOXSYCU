import type { Transaction, TransactionType } from './types'
import { customer as preservedSeed } from './data/mockData'

const CHECKING = { name: 'Checking Account', accountLast4: preservedSeed.account.last4 }
const institutions = [
  { name: 'JPMorgan Chase Bank, N.A.', type: 'National bank' }, { name: 'Bank of America, N.A.', type: 'National bank' },
  { name: 'Wells Fargo Bank, N.A.', type: 'National bank' }, { name: 'Citibank, N.A.', type: 'National bank' },
  { name: 'U.S. Bank National Association', type: 'National bank' }, { name: 'PNC Bank, N.A.', type: 'National bank' },
  { name: 'Truist Bank', type: 'National bank' }, { name: 'Capital One, N.A.', type: 'National bank' },
]
const merchants = [
  ['Apple Store', 'Electronics'], ['Adobe', 'Software'], ['Delta Air Lines', 'Travel'], ['United Airlines', 'Travel'],
  ['Marriott', 'Lodging'], ['Whole Foods Market', 'Groceries'], ['Costco Wholesale', 'Groceries'], ['Office Depot', 'Office supplies'],
  ['Shell', 'Fuel'], ['Uber', 'Transportation'], ['Amazon', 'Retail'], ['AT&T', 'Telecommunications'], ['Comcast', 'Utilities'],
  ['GEICO', 'Insurance'], ['State Farm', 'Insurance'],
] as const
const beneficiaries = [{ name: 'Alex Smith', accountLast4: '1920' }, { name: 'Maria Johnson', accountLast4: '4472' }, { name: 'Northstar Holdings', accountLast4: '8104' }]
const slug = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
const ledgerImpact = (t: Transaction) => t.amount - (t.fee || 0)

function typeFor(t: Transaction): TransactionType {
  if (t.type) return t.type
  if (t.kind === 'Card Purchase') return 'CARD_PURCHASE'
  if (t.kind === 'Interest') return 'INTEREST_CREDIT'
  if (t.kind === 'Fee') return 'FEE'
  if (t.kind === 'Withdrawal') return 'ATM_WITHDRAWAL'
  if (t.kind === 'Savings') return 'INTERNAL_TRANSFER'
  if (t.kind === 'Deposit') return 'ACH_CREDIT'
  return 'TRANSFER'
}

function makeReference(type: TransactionType, date: string, index: number) {
  const compact = date.replace(/[^0-9]/g, '').slice(0, 8)
  const prefix = type === 'WIRE_OUT' ? 'FXW' : type.startsWith('ZELLE') ? 'ZL' : type.startsWith('ACH') ? 'ACH' : type.startsWith('CARD') ? 'CARD' : type === 'FEE' ? 'FEE' : 'FX'
  return `${prefix}-${compact}-${slug(`${index}${type}`)}${String(index % 100).padStart(2, '0')}`
}

function enrichSingle(t: Transaction, index: number): Transaction {
  const type = typeFor(t), debit = t.amount < 0, direction = debit ? 'DEBIT' : 'CREDIT'
  const institution = institutions[index % institutions.length], beneficiary = beneficiaries[index % beneficiaries.length]
  const party = { name: t.counterparty || beneficiary.name, accountLast4: beneficiary.accountLast4 }
  const date = t.effectiveDate || t.date, time = t.time || '10:42 AM'
  let description = t.description, merchant: string | undefined, merchantCategory: string | undefined
  let memo = t.memo, fee = t.fee ?? 0
  if (type === 'CARD_PURCHASE') { const [m, c] = merchants[index % merchants.length]; merchant = t.merchant || m; merchantCategory = t.merchantCategory || c; description = merchant }
  if (type === 'ACH_CREDIT' && !t.description.toLowerCase().includes('treasury')) { description = t.description.toLowerCase().includes('income') ? 'ACH Credit — Payroll / Business Income' : 'ACH Credit — Business Operating Deposit'; memo ||= 'Operating income' }
  if (type === 'TRANSFER' || type === 'INTERNAL_TRANSFER') { description = debit ? `Transfer to ${party.name}` : `Transfer from ${party.name}`; memo ||= debit ? 'General transfer' : 'Incoming transfer' }
  if (type === 'ZELLE_OUT') description = `Zelle payment to ${party.name}`
  if (type === 'WIRE_OUT') description = 'Domestic Wire Transfer'
  if (type === 'INTEREST_CREDIT') description = 'Savings Interest Credit'
  if (type === 'FEE') description = 'Monthly account service fee'
  return {
    ...t, reference: t.reference || makeReference(type, date, index), type, direction,
    sourceAccount: debit ? CHECKING : { name: 'External Funding Account', accountLast4: '••••' }, destinationAccount: debit ? party : CHECKING,
    counterparty: t.counterparty || party.name, counterpartyDetails: party,
    institution: type.startsWith('WIRE') || type.startsWith('ACH') || type.startsWith('TRANSFER') ? institution : undefined,
    merchant, merchantCategory, initiatedAt: t.initiatedAt || `${date} ${time} ET`, effectiveDate: date,
    postedAt: t.status === 'Pending' ? undefined : `${date} ${time} ET`, memo, fee, description, category: t.category || type,
    metadata: { rail: type, synthetic: true, ...(type === 'ZELLE_OUT' ? { recipientEnrollment: 'enrolled email' } : {}), ...(type === 'WIRE_OUT' ? { delivery: 'Same business day' } : {}) },
  }
}

function expandMonthlyActivity(seed: Transaction, seedIndex: number): Transaction[] {
  if (seed.id.startsWith('SPEND-')) {
    const total = Math.abs(seed.amount), a = Number((total * 0.46).toFixed(2)), b = Number((total * 0.31).toFixed(2))
    return [a, b, Number((total - a - b).toFixed(2))].map((amount, i) => enrichSingle({ ...seed, id: `${seed.id}-${i + 1}`, amount: -amount, description: 'Card purchase activity', reference: '', counterparty: undefined, merchant: merchants[(seedIndex + i) % merchants.length][0], merchantCategory: merchants[(seedIndex + i) % merchants.length][1] }, seedIndex * 3 + i))
  }
  if (seed.id.startsWith('DEP-')) {
    const first = Number((seed.amount * 0.62).toFixed(2))
    return [first, Number((seed.amount - first).toFixed(2))].map((amount, i) => enrichSingle({ ...seed, id: `${seed.id}-${i + 1}`, amount, description: i === 0 ? 'ACH Credit — Business Income' : 'ACH Credit — Operating Deposit', reference: '', counterparty: i === 0 ? 'Northstar Consulting LLC' : 'Meridian Operating LLC' }, seedIndex * 2 + i))
  }
  if (seed.id.startsWith('TRF-')) return [enrichSingle({ ...seed, reference: '', type: seedIndex % 3 === 0 ? 'WIRE_OUT' : 'TRANSFER' }, seedIndex)]
  if (seed.id.startsWith('TOPUP-')) return [enrichSingle({ ...seed, reference: '', type: 'ACH_CREDIT', counterparty: 'Northstar Holdings Treasury' }, seedIndex)]
  return [enrichSingle(seed, seedIndex)]
}

function withRunningBalances(transactions: Transaction[], openingBalance: number): Transaction[] {
  let posted = openingBalance
  return [...transactions].sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime()).map(t => {
    if (t.status === 'Completed') posted += ledgerImpact(t)
    const pendingDebit = t.status === 'Pending' && t.amount < 0 ? Math.abs(t.amount) + (t.fee || 0) : 0
    const pendingCredit = t.status === 'Pending' && t.amount > 0 ? t.amount - (t.fee || 0) : 0
    return { ...t, postedBalanceAfter: Number(posted.toFixed(2)), availableBalanceAfter: Number((posted - pendingDebit + pendingCredit).toFixed(2)) }
  }).sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime())
}

/** Builds the synthetic banking universe from the preserved seed ledger. */
export function buildTransactionUniverse(seed: Transaction[], openingBalance = preservedSeed.account.openingBalance, targetBalance = preservedSeed.availableBalance): Transaction[] {
  const expanded = seed.flatMap((t, i) => expandMonthlyActivity(t, i))
  const detailed = expanded.map((t, i) => {
    if (t.id === 'TX-20260906-005') return enrichSingle({ ...t, type: 'TRANSFER', memo: 'Property reserve', counterparty: 'Alex Smith' }, i)
    if (t.id === 'TX-20260909-007') return enrichSingle({ ...t, type: 'FEE', fee: 41.25 }, i)
    if (t.id === 'TX-20260911-009') return enrichSingle({ ...t, type: 'SCHEDULED_TRANSFER', status: 'Pending', memo: 'Emergency reserve contribution' }, i)
    return enrichSingle(t, i)
  })
  const current: Transaction[] = [
    { id: 'ZL-20260908-4P7N2', kind: 'Transfer', type: 'ZELLE_OUT', status: 'Completed', amount: -1250, currency: 'USD', direction: 'DEBIT', description: 'Zelle payment to Maria Johnson', date: 'Sep 08, 2026', time: '11:16 AM', reference: 'ZL-260908-4P7N2', counterparty: 'Maria Johnson', counterpartyDetails: { name: 'Maria Johnson', email: 'maria.johnson@example.test' }, category: 'Zelle', memo: 'Reimbursement', fee: 0 },
    { id: 'FXW-20260827-91KD7', kind: 'Transfer', type: 'WIRE_OUT', status: 'Completed', amount: -85000, currency: 'USD', direction: 'DEBIT', description: 'Domestic Wire Transfer', date: 'Aug 27, 2026', time: '01:12 PM', reference: 'FXW-260827-91KD7', counterparty: 'Northstar Holdings', counterpartyDetails: { name: 'Northstar Holdings', accountLast4: '8104' }, institution: { name: 'JPMorgan Chase Bank, N.A.', type: 'National bank' }, memo: 'Property acquisition', fee: 15, category: 'Domestic wire', metadata: { grossAmount: 85000, wireFee: 15, delivery: 'Same business day', synthetic: true } },
    { id: 'CARD-20260904-4821', kind: 'Card Purchase', type: 'CARD_PURCHASE', status: 'Completed', amount: -1249, currency: 'USD', direction: 'DEBIT', description: 'Apple Store', date: 'Sep 04, 2026', time: '03:42 PM', reference: 'CARD-260904-4821', merchant: 'Apple Store', merchantCategory: 'Electronics', counterparty: 'Apple Store', category: 'Electronics', fee: 0 },
  ]
  const all = [...detailed, ...current]
  const posted = openingBalance + all.filter(t => t.status === 'Completed').reduce((sum, t) => sum + ledgerImpact(t), 0)
  const adjustment = Number((targetBalance - posted).toFixed(2))
  if (Math.abs(adjustment) > 0.01) all.push(enrichSingle({ id: 'TX-RECON-2026', kind: adjustment >= 0 ? 'Deposit' : 'Transfer', type: adjustment >= 0 ? 'INTERNAL_TRANSFER' : 'TRANSFER', status: 'Completed', amount: adjustment, currency: 'USD', description: 'Portfolio liquidity transfer', date: 'Sep 10, 2026', time: '03:17 PM', reference: 'FX-260910-RECON', counterparty: 'Linked investment account', category: 'Treasury / liquidity', memo: 'Portfolio reconciliation entry', fee: 0 }, 9999))
  return withRunningBalances(all, openingBalance)
}

export function calculateBalances(transactions: Transaction[], openingBalance = preservedSeed.account.openingBalance) {
  const posted = openingBalance + transactions.filter(t => t.status === 'Completed').reduce((sum, t) => sum + ledgerImpact(t), 0)
  const pendingDebits = transactions.filter(t => t.status === 'Pending' && t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount) + (t.fee || 0), 0)
  const pendingCredits = transactions.filter(t => t.status === 'Pending' && t.amount > 0).reduce((sum, t) => sum + t.amount - (t.fee || 0), 0)
  return { posted, available: posted - pendingDebits + pendingCredits, pendingDebits, pendingCredits }
}
