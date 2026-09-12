import type { CustomerSnapshot, Transaction } from '../types'
import { buildTransactionUniverse } from '../transactionEngine'

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
  const monthlyIncome = 42000 + yearOffset * 10500 + (monthIndex % 4) * 1750
  const monthlySpending = -(10500 + yearOffset * 2500 + (monthIndex % 3) * 650)

  historicalTransactions.push({ id: `DEP-${year}-${pad(monthIndex + 1)}`, kind: 'Deposit', description: year >= 2024 ? 'Recurring business income' : 'USD account deposit', date: `${month} 03, ${year}`, time: '09:14 AM', amount: monthlyIncome, currency: 'USD', status: 'Completed', reference: reference('ACH', year, monthIndex, index + 1), category: 'Income', counterparty: year >= 2024 ? 'Business operating account' : 'External USD account' })
  historicalTransactions.push({ id: `SPEND-${year}-${pad(monthIndex + 1)}`, kind: 'Card Purchase', description: year >= 2024 ? 'Card purchases — monthly activity' : 'Card purchase activity', date: `${month} 18, ${year}`, time: '02:37 PM', amount: monthlySpending, currency: 'USD', status: 'Completed', reference: reference('CARD', year, monthIndex, index + 1), category: 'Card spending', counterparty: 'Everyday merchants' })

  if (index % 2 === 0) {
    historicalTransactions.push({ id: `TRF-${year}-${pad(monthIndex + 1)}`, kind: 'Transfer', description: 'Transfer to beneficiary', date: `${month} 24, ${year}`, time: '11:22 AM', amount: -(4200 + yearOffset * 700), currency: 'USD', status: 'Completed', reference: reference('TRF', year, monthIndex, index + 20), category: 'Transfer', counterparty: index % 4 === 0 ? 'Alex Smith' : 'Maria Johnson' })
  }

  if (year >= 2022 && monthIndex % 3 === 0) {
    historicalTransactions.push({ id: `TOPUP-${year}-${pad(monthIndex + 1)}`, kind: 'Deposit', description: 'Treasury transfer received', date: `${month} 26, ${year}`, time: '04:48 PM', amount: 12500 + yearOffset * 1800, currency: 'USD', status: 'Completed', reference: reference('DEP', year, monthIndex, index + 40), category: 'Transfer', counterparty: 'Linked USD account' })
  }
})

historicalTransactions.push(
  { id: 'TX-20260901-001', kind: 'Interest', description: 'Savings interest credit', date: 'Sep 01, 2026', time: '12:03 AM', amount: 1842.36, currency: 'USD', status: 'Completed', reference: 'INT-20260901-0001', category: 'Interest', counterparty: 'FNCU Savings Engine' },
  { id: 'TX-20260902-002', kind: 'Deposit', description: 'Business income deposit', date: 'Sep 02, 2026', time: '09:08 AM', amount: 98500, currency: 'USD', status: 'Completed', reference: 'ACH-20260902-1847', category: 'Income', counterparty: 'Business operating account' },
  { id: 'TX-20260904-003', kind: 'Card Purchase', description: 'Card purchase — Adobe', date: 'Sep 04, 2026', time: '01:42 PM', amount: -84.50, currency: 'USD', status: 'Completed', reference: 'CARD-20260904-4821', category: 'Software', counterparty: 'Adobe' },
  { id: 'TX-20260905-004', kind: 'Card Purchase', description: 'Card purchase — office supply', date: 'Sep 05, 2026', time: '03:26 PM', amount: -2860.40, currency: 'USD', status: 'Completed', reference: 'CARD-20260905-6194', category: 'Office', counterparty: 'Office Depot' },
  { id: 'TX-20260906-005', kind: 'Transfer', description: 'Transfer to Alex Smith', date: 'Sep 06, 2026', time: '04:05 PM', amount: -12000, currency: 'USD', status: 'Completed', reference: 'TRF-20260906-73184', category: 'Transfer', counterparty: 'Alex Smith' },
  { id: 'TX-20260907-006', kind: 'Card Purchase', description: 'Card purchase — travel', date: 'Sep 07, 2026', time: '10:31 AM', amount: -7850, currency: 'USD', status: 'Completed', reference: 'CARD-20260907-4821', category: 'Travel', counterparty: 'Travel services' },
  { id: 'TX-20260909-007', kind: 'Fee', description: 'Monthly account service fee', date: 'Sep 09, 2026', time: '08:00 AM', amount: -41.25, currency: 'USD', status: 'Completed', reference: 'FEE-20260909-0009', category: 'Banking fee', counterparty: 'FNCU' },
  { id: 'TX-20260910-008', kind: 'Deposit', description: 'USD transfer received', date: 'Sep 10, 2026', time: '02:41 PM', amount: 26500, currency: 'USD', status: 'Completed', reference: 'DEP-20260910-0042', category: 'Transfer', counterparty: 'Linked USD account' },
  { id: 'TX-20260911-009', kind: 'Transfer', description: 'Transfer to savings vault', date: 'Sep 11, 2026', time: '09:21 AM', amount: -25000, currency: 'USD', status: 'Pending', reference: 'TRF-20260911-0091', category: 'Savings', counterparty: 'Emergency Reserve Vault' },
)

const openingBalance = 125000
const postedBeforeBalancing = openingBalance + historicalTransactions.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0)
const balancingDeposit = Number((5000000 - postedBeforeBalancing).toFixed(2))
historicalTransactions.push({ id: 'TX-20260910-010', kind: 'Deposit', description: 'Portfolio liquidity transfer', date: 'Sep 10, 2026', time: '03:17 PM', amount: balancingDeposit, currency: 'USD', status: 'Completed', reference: 'ACH-20260910-5521', category: 'Treasury / liquidity', counterparty: 'John Doe — linked investment account' })

const transactions = buildTransactionUniverse(historicalTransactions)
const savingsVaults = [
  { id: 'v1', name: 'Emergency Reserve', balance: 250000, apy: 4.5, target: 300000, opened: 'April 09, 2021', interestEarned: 6842.12 },
  { id: 'v2', name: 'Property Reserve', balance: 250000, apy: 4.5, target: 500000, opened: 'June 14, 2023', interestEarned: 5214.68 },
  { id: 'v3', name: 'Travel & Lifestyle', balance: 125000, apy: 4.5, target: 200000, opened: 'January 21, 2025', interestEarned: 1842.36 },
]

export const customer: CustomerSnapshot = {
  name: 'John Doe', membership: 'Premium User', currency: 'USD', customerSince: 'March 18, 2021', accountOpened: 'March 18, 2021', accountType: 'Private checking', accountStatus: 'Active', availableBalance: 5000000, savingsBalance: 625000, pendingBalance: 25000, apy: 4.5, interestEarned: 1842.36, transactions,
  vaults: savingsVaults,
  savingsVaults,
  beneficiaries: [
    { id: 'ben-001', name: 'Alex Smith', accountLast4: '1920', currency: 'USD', added: 'May 12, 2022' },
    { id: 'ben-002', name: 'Maria Johnson', accountLast4: '4472', currency: 'USD', added: 'August 07, 2023' },
    { id: 'ben-003', name: 'Northstar Holdings', accountLast4: '8104', currency: 'USD', added: 'February 19, 2025' },
  ],
}
