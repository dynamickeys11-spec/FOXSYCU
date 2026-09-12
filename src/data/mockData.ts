import type { CustomerSnapshot } from '../types'

export const customer: CustomerSnapshot = {
  name: 'John Doe',
  membership: 'Premium User',
  currency: 'USD',
  availableBalance: 12450,
  savingsBalance: 7500,
  apy: 4.5,
  interestEarned: 31.25,
  transactions: [
    { id: 'TX-1004', kind: 'Interest', description: 'Savings interest', date: 'Sep 10, 2026', time: '09:12 AM', amount: 31.25, currency: 'USD', status: 'Completed', reference: 'INT-20260910-004' },
    { id: 'TX-1003', kind: 'Deposit', description: 'USD account deposit', date: 'Sep 9, 2026', time: '02:41 PM', amount: 500, currency: 'USD', status: 'Completed', reference: 'DEP-20260909-003' },
    { id: 'TX-1002', kind: 'Transfer', description: 'Transfer to beneficiary', date: 'Sep 8, 2026', time: '11:18 AM', amount: -120, currency: 'USD', status: 'Completed', reference: 'TRF-20260908-002' },
    { id: 'TX-1001', kind: 'Deposit', description: 'USD account deposit', date: 'Sep 6, 2026', time: '04:05 PM', amount: 250, currency: 'USD', status: 'Completed', reference: 'DEP-20260906-001' },
  ],
  vaults: [
    { id: 'v1', name: 'Emergency Vault', balance: 3500, apy: 4.5, target: 5000 },
    { id: 'v2', name: 'Property Deposit', balance: 2500, apy: 4.5, target: 10000 },
    { id: 'v3', name: 'Travel Vault', balance: 1500, apy: 4.5, target: 3000 },
  ],
}
