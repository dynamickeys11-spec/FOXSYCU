import type { Transaction, TransactionKind, TransactionStatus } from '../types'

const PEOPLE = [
  ['Michael Carter', '4472'],
  ['Lauren Mitchell', '2816'],
  ['Daniel Brooks', '6391'],
  ['Olivia Bennett', '1048'],
  ['Marcus Reynolds', '7314'],
  ['Christopher Hayes', '5269'],
] as const

const MERCHANTS = [
  ['Whole Foods Market', 'Groceries', 'Austin, TX'],
  ['Costco Wholesale', 'Wholesale', 'Austin, TX'],
  ['Target', 'Retail', 'Round Rock, TX'],
  ['The Home Depot', 'Home Improvement', 'Austin, TX'],
  ['Delta Air Lines', 'Airlines', 'Atlanta, GA'],
  ['Marriott', 'Lodging', 'Austin, TX'],
  ['Uber', 'Transportation', 'Austin, TX'],
  ['Apple', 'Electronics', 'Austin, TX'],
  ['Netflix', 'Entertainment', 'Los Gatos, CA'],
  ['Shell', 'Fuel', 'Austin, TX'],
] as const

const BANKS = [
  ['JPMorgan Chase Bank, N.A.', 'Bank'],
  ['Bank of America, N.A.', 'Bank'],
  ['Wells Fargo Bank, N.A.', 'Bank'],
  ['Citibank, N.A.', 'Bank'],
  ['U.S. Bank National Association', 'Bank'],
  ['Capital One, N.A.', 'Bank'],
] as const

const hash = (value: string) => {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619)
  return Math.abs(h >>> 0)
}

const pick = <T,>(items: readonly T[], key: string) => items[hash(key) % items.length]

const statusTitle = (status: TransactionStatus) => {
  if (status === 'Pending') return 'pending'
  if (status === 'Failed') return 'failed'
  if (status === 'Reversed') return 'reversed'
  return 'posted'
}

export function enrichTransaction(transaction: Transaction, index = 0): Transaction {
  const key = `${transaction.reference}:${index}`
  const bank = pick(BANKS, `${key}:bank`)
  const person = pick(PEOPLE, `${key}:person`)
  const merchant = pick(MERCHANTS, `${key}:merchant`)
  const amount = Math.abs(transaction.amount)
  const kind: TransactionKind = transaction.kind
  const base = new Date(transaction.createdAt ?? transaction.effectiveDate ?? transaction.date)
  const eventAt = Number.isNaN(base.getTime()) ? new Date().toISOString() : base.toISOString()
  const common = {
    ...transaction,
    synthetic: true as const,
    institution: { name: bank[0], type: bank[1] },
    initiatedAt: transaction.initiatedAt ?? eventAt,
    effectiveDate: transaction.effectiveDate ?? transaction.createdAt ?? eventAt,
    postedAt: transaction.status === 'Completed' ? transaction.postedAt ?? eventAt : transaction.postedAt ?? undefined,
    metadata: {
      ...(transaction.metadata ?? {}),
      demo_data: true,
      institution_name: bank[0],
      account_last4: transaction.accountId?.slice(-4) ?? '4821',
      communication_ready: true,
    },
  }

  if (kind === 'Payment' || kind === 'Card Purchase' || transaction.category?.toLowerCase().includes('card')) {
    const m = merchant
    return {
      ...common,
      type: transaction.type ?? 'CARD_PURCHASE',
      kind: 'Card Purchase',
      counterparty: m[0],
      merchant: m[0],
      merchantCategory: m[1],
      description: transaction.status === 'Pending' ? `${m[0]} card authorization` : `${m[0]} card purchase`,
      memo: transaction.memo && !transaction.memo.includes('Synthetic') ? transaction.memo : `${m[1]} purchase`,
      metadata: { ...common.metadata, merchant_location: m[2], card_last4: '4821', authorization_code: `A${String(hash(key)).slice(-6)}` },
    }
  }

  if (kind === 'Deposit' || transaction.amount > 0) {
    return {
      ...common,
      type: transaction.type ?? 'ACH_CREDIT',
      kind: 'Deposit',
      counterparty: person[0],
      counterpartyDetails: { name: person[0], accountLast4: person[1] },
      description: transaction.status === 'Pending' ? 'ACH credit pending' : transaction.status === 'Failed' ? 'ACH credit failed' : transaction.status === 'Reversed' ? 'ACH credit reversed' : 'ACH credit received',
      memo: transaction.memo && !transaction.memo.includes('Synthetic') ? transaction.memo : 'ACH credit',
      metadata: { ...common.metadata, ach_originator: person[0], originator_account_last4: person[1], trace_number: `0910${String(hash(key)).padStart(12, '0').slice(-12)}` },
    }
  }

  const recipient = person
  const transferKind = transaction.type === 'WIRE_OUT' ? 'WIRE_OUT' : transaction.type === 'ZELLE_OUT' ? 'ZELLE_OUT' : 'TRANSFER'
  return {
    ...common,
    type: transaction.type ?? transferKind,
    kind: transaction.kind === 'Transfer' ? 'Transfer' : transaction.kind,
    counterparty: recipient[0],
    counterpartyDetails: { name: recipient[0], accountLast4: recipient[1] },
    destinationAccount: { name: recipient[0], accountLast4: recipient[1] },
    description: transaction.status === 'Pending' ? `Transfer to ${recipient[0]} pending` : transaction.status === 'Failed' ? `Transfer to ${recipient[0]} failed` : transaction.status === 'Reversed' ? `Transfer to ${recipient[0]} reversed` : `Transfer to ${recipient[0]}`,
    memo: transaction.memo && !transaction.memo.includes('Synthetic') ? transaction.memo : 'Personal transfer',
    metadata: { ...common.metadata, beneficiary_name: recipient[0], beneficiary_account_last4: recipient[1], transfer_reference: transaction.reference },
  }
}

export function messageForTransaction(transaction: Transaction): { subject: string; body: string; messageType: string; priority: string } {
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(transaction.amount))
  const date = transaction.effectiveDate ?? transaction.date
  const status = statusTitle(transaction.status)
  const reference = transaction.reference
  const accountLast4 = String(transaction.metadata?.account_last4 ?? transaction.accountId?.slice(-4) ?? '4821')
  const counterparty = transaction.counterparty ?? 'your account'
  const bank = String(transaction.institution?.name ?? transaction.metadata?.institution_name ?? 'U.S. Bank National Association')
  const available = typeof transaction.availableBalanceAfter === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.availableBalanceAfter) : null

  if (transaction.kind === 'Card Purchase') {
    const location = String(transaction.metadata?.merchant_location ?? 'United States')
    const subject = transaction.status === 'Pending' ? `Card authorization · ${counterparty}` : `Card purchase ${status} · ${counterparty}`
    return { subject, messageType: 'transaction', priority: transaction.status === 'Failed' ? 'high' : 'normal', body: `Your checking account ending in ${accountLast4} ${transaction.status === 'Pending' ? 'was used to authorize' : transaction.status === 'Reversed' ? 'received a reversal for' : 'recorded'} ${amount} at ${counterparty} in ${location} on ${date}.\n\nTransaction type: Card purchase\nMerchant category: ${transaction.merchantCategory ?? 'Purchase'}\nStatus: ${transaction.status}\nReference: ${reference}${available ? `\nAvailable balance: ${available}` : ''}\n\nIf you do not recognize this activity, review the transaction details and contact FOXSYCU immediately.` }
  }

  if (transaction.kind === 'Deposit') {
    return { subject: `ACH credit ${status} · ${counterparty}`, messageType: 'transaction', priority: transaction.status === 'Failed' ? 'high' : 'normal', body: `${amount} ${transaction.status === 'Pending' ? 'has been received as a pending ACH credit' : transaction.status === 'Failed' ? 'was not credited because the ACH transaction failed' : transaction.status === 'Reversed' ? 'was posted as a reversal of an incoming ACH credit' : 'was credited to'} your checking account ending in ${accountLast4}.\n\nOriginator: ${counterparty}\nOriginating institution: ${bank}\nEffective date: ${date}\nStatus: ${transaction.status}\nReference: ${reference}${available ? `\nAvailable balance: ${available}` : ''}` }
  }

  return { subject: `Transfer ${status} · ${counterparty}`, messageType: 'transaction', priority: transaction.status === 'Failed' ? 'high' : 'normal', body: `${amount} ${transaction.status === 'Pending' ? 'is pending for a transfer' : transaction.status === 'Failed' ? 'was not sent because the transfer failed' : transaction.status === 'Reversed' ? 'was returned following a transfer reversal' : 'was sent in a transfer'} involving your checking account ending in ${accountLast4}.\n\nRecipient: ${counterparty}\nDestination account: ••••${String(transaction.counterpartyDetails?.accountLast4 ?? transaction.destinationAccount?.accountLast4 ?? '0000')}\nReference: ${reference}\nStatus: ${transaction.status}\nEffective date: ${date}${available ? `\nAvailable balance: ${available}` : ''}` }
}
