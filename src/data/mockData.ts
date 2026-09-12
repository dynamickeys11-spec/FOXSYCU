import type { CustomerSnapshot, Transaction } from '../types'

const months = [
  ['Mar', 2021], ['Apr', 2021], ['May', 2021], ['Jun', 2021], ['Jul', 2021], ['Aug', 2021], ['Sep', 2021], ['Oct', 2021], ['Nov', 2021], ['Dec', 2021],
  ['Jan', 2022], ['Feb', 2022], ['Mar', 2022], ['Apr', 2022], ['May', 2022], ['Jun', 2022], ['Jul', 2022], ['Aug', 2022], ['Sep', 2022], ['Oct', 2022], ['Nov', 2022], ['Dec', 2022],
  ['Jan', 2023], ['Feb', 2023], ['Mar', 2023], ['Apr', 2023], ['May', 2023], ['Jun', 2023], ['Jul', 2023], ['Aug', 2023], ['Sep', 2023], ['Oct', 2023], ['Nov', 2023], ['Dec', 2023],
  ['Jan', 2024], ['Feb', 2024], ['Mar', 2024], ['Apr', 2024], ['May', 2024], ['Jun', 2024], ['Jul', 2024], ['Aug', 2024], ['Sep', 2024], ['Oct', 2024], ['Nov', 2024], ['Dec', 2024],
  ['Jan', 2025], ['Feb', 2025], ['Mar', 2025], ['Apr', 2025], ['May', 2025], ['Jun', 2025], ['Jul', 2025], ['Aug', 2025], ['Sep', 2025], ['Oct', 2025], ['Nov', 2025], ['Dec', 2025],
  ['Jan', 2026], ['Feb', 2026], ['Mar', 2026], ['Apr', 2026], ['May', 2026], ['Jun', 2026], ['Jul', 2026], ['Aug', 2026],
] as const

const pad = (n: number) => String(n).padStart(2, '0')
const reference = (prefix: string, year: number, monthIndex: number, sequence: number) => `${prefix}-${year}${pad(monthIndex + 1)}-${String(sequence).padStart(4, '0')}`

const historicalTransactions: Transaction[] = []

months.forEach(([month, year], index) => {
  const monthIndex = index % 12
  const yearOffset = year - 2021
  const deposit = year >= 2026 ? 800 : 700
  const spending = year >= 2026 ? -600 : -540

  historicalTransactions.push({
    id: `DEP-${year}-${pad(monthIndex + 1)}`,
    kind: 'Deposit',
    description: year >= 2024 ? 'Recurring income deposit' : 'USD account deposit',
    date: `${month} 03, ${year}`,
    time: '09:14 AM',
    amount: deposit,
    currency: 'USD',
    status: 'Completed',
    reference: reference('ACH', year, monthIndex, index + 1),
    category: 'Income',
    counterparty: year >= 2024 ? 'Payroll / recurring income' : 'External USD transfer',
  })

  historicalTransactions.push({
    id: `SPEND-${year}-${pad(monthIndex + 1)}`,
    kind: 'Card Purchase',
    description: year >= 2024 ? 'Monthly card spending' : 'Card purchase activity',
    date: `${month} 18, ${year}`,
    time: '02:37 PM',
    amount: spending,
    currency: 'USD',
    status: 'Completed',
    reference: reference('CARD', year, monthIndex, index + 1),
    category: 'Card spending',
    counterparty: 'Everyday purchases',
  })

  if (year >= 2023 && monthIndex % 3 === 0) {
    historicalTransactions.push({
      id: `TRF-${year}-${pad(monthIndex + 1)}`,
      kind: 'Transfer',
      description: 'Transfer to beneficiary',
      date: `${month} 24, ${year}`,
      time: '11:22 AM',
      amount: -120,
      currency: 'USD',
      status: 'Completed',
      reference: reference('TRF', year, monthIndex, index + 20),
      category: 'Transfer',
      counterparty: index % 2 ? 'Alex Smith' : 'Maria Johnson',
    })
    historicalTransactions.push({
      id: `TOPUP-${year}-${pad(monthIndex + 1)}`,
      kind: 'Deposit',
      description: 'Additional USD deposit',
      date: `${month} 26, ${year}`,
      time: '04:48 PM',
      amount: 120,
      currency: 'USD',
      status: 'Completed',
      reference: reference('DEP', year, monthIndex, index + 40),
      category: 'Transfer',
      counterparty: 'External USD account',
    })
  }
})

// 2026 activity is deliberately more detailed so the current account feels actively used.
historicalTransactions.push(
  { id: 'TX-20260901-001', kind: 'Interest', description: 'Savings interest credit', date: 'Sep 01, 2026', time: '12:03 AM', amount: 31.25, currency: 'USD', status: 'Completed', reference: 'INT-20260901-0001', category: 'Interest', counterparty: 'FOXSYCU Savings Engine' },
  { id: 'TX-20260902-002', kind: 'Deposit', description: 'Recurring income deposit', date: 'Sep 02, 2026', time: '09:08 AM', amount: 1200, currency: 'USD', status: 'Completed', reference: 'ACH-20260902-1847', category: 'Income', counterparty: 'Payroll / recurring income' },
  { id: 'TX-20260904-003', kind: 'Card Purchase', description: 'Card purchase — Adobe', date: 'Sep 04, 2026', time: '01:42 PM', amount: -84.50, currency: 'USD', status: 'Completed', reference: 'CARD-20260904-4821', category: 'Software', counterparty: 'Adobe' },
  { id: 'TX-20260906-004', kind: 'Transfer', description: 'Transfer to Alex Smith', date: 'Sep 06, 2026', time: '04:05 PM', amount: -120, currency: 'USD', status: 'Completed', reference: 'TRF-20260906-73184', category: 'Transfer', counterparty: 'Alex Smith' },
  { id: 'TX-20260907-005', kind: 'Card Purchase', description: 'Card purchase — everyday spend', date: 'Sep 07, 2026', time: '10:31 AM', amount: -515.50, currency: 'USD', status: 'Completed', reference: 'CARD-20260907-4821', category: 'Everyday', counterparty: 'Everyday purchases' },
  { id: 'TX-20260909-006', kind: 'Fee', description: 'Monthly account service fee', date: 'Sep 09, 2026', time: '08:00 AM', amount: -41.25, currency: 'USD', status: 'Completed', reference: 'FEE-20260909-0009', category: 'Banking fee', counterparty: 'FOXSYCU' },
  { id: 'TX-20260910-007', kind: 'Deposit', description: 'USD account deposit', date: 'Sep 10, 2026', time: '02:41 PM', amount: 68.75, currency: 'USD', status: 'Completed', reference: 'DEP-20260910-0042', category: 'Deposit', counterparty: 'External USD account' },
  { id: 'TX-20260911-008', kind: 'Transfer', description: 'Transfer to savings vault', date: 'Sep 11, 2026', time: '09:21 AM', amount: -288.75, currency: 'USD', status: 'Pending', reference: 'TRF-20260911-0091', category: 'Savings', counterparty: 'Emergency Vault' },
)

// Keep the demo ledger internally consistent: the historical opening balance plus posted
// account activity resolves to the displayed available balance of $12,450.00 before the
// currently pending savings movement.
const postedBalance = 1000 + historicalTransactions.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0)
const balancingDeposit = Number((12450 - postedBalance).toFixed(2))
if (balancingDeposit !== 0) {
  historicalTransactions.push({
    id: 'TX-20260910-009',
    kind: 'Deposit',
    description: 'USD transfer received',
    date: 'Sep 10, 2026',
    time: '03:17 PM',
    amount: balancingDeposit,
    currency: 'USD',
    status: 'Completed',
    reference: 'ACH-20260910-5521',
    category: 'Transfer',
    counterparty: 'External USD account',
  })
}

const transactions = [...historicalTransactions].sort((a, b) => {
  const left = new Date(`${a.date} ${a.time}`).getTime()
  const right = new Date(`${b.date} ${b.time}`).getTime()
  return right - left
})

export const customer: CustomerSnapshot = {
  name: 'John Doe',
  membership: 'Premium User',
  currency: 'USD',
  customerSince: 'March 18, 2021',
  accountOpened: 'March 18, 2021',
  accountType: 'Personal checking',
  accountStatus: 'Active',
  availableBalance: 12450,
  savingsBalance: 7500,
  pendingBalance: 288.75,
  apy: 4.5,
  interestEarned: 31.25,
  transactions,
  vaults: [
    { id: 'v1', name: 'Emergency Vault', balance: 3500, apy: 4.5, target: 5000, opened: 'April 09, 2021', interestEarned: 14.62 },
    { id: 'v2', name: 'Property Deposit', balance: 2500, apy: 4.5, target: 10000, opened: 'June 14, 2023', interestEarned: 10.84 },
    { id: 'v3', name: 'Travel Vault', balance: 1500, apy: 4.5, target: 3000, opened: 'January 21, 2025', interestEarned: 5.79 },
  ],
  beneficiaries: [
    { id: 'ben-001', name: 'Alex Smith', accountLast4: '1920', currency: 'USD', added: 'May 12, 2022' },
    { id: 'ben-002', name: 'Maria Johnson', accountLast4: '4472', currency: 'USD', added: 'August 07, 2023' },
  ],
}
