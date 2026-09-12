import { amountForEntry, type AccountLedger } from './ledger'

export type BalancePoint = { label: string; balance: number }

export function buildBalanceSeries(ledger: AccountLedger, days: 30 | 90, count = 5): BalancePoint[] {
  const completed = ledger.entries
    .filter(entry => entry.status === 'Completed')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const latest = completed.length ? new Date(completed[completed.length - 1].createdAt) : new Date()
  const start = new Date(latest)
  start.setUTCDate(start.getUTCDate() - days)

  const balanceBeforeStart = ledger.openingBalance + completed
    .filter(entry => new Date(entry.createdAt) <= start)
    .reduce((sum, entry) => sum + amountForEntry(entry), 0)

  let cursor = balanceBeforeStart
  let entryIndex = 0
  while (entryIndex < completed.length && new Date(completed[entryIndex].createdAt) <= start) entryIndex += 1

  return Array.from({ length: count }, (_, index) => {
    const pointDate = new Date(start)
    pointDate.setUTCDate(start.getUTCDate() + Math.round(days * index / (count - 1)))

    while (entryIndex < completed.length && new Date(completed[entryIndex].createdAt) <= pointDate) {
      cursor += amountForEntry(completed[entryIndex])
      entryIndex += 1
    }

    return {
      label: pointDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      balance: Math.round(cursor * 100) / 100,
    }
  })
}

export function balancePath(points: BalancePoint[], width = 800, height = 220, padding = 18): string {
  if (!points.length) return ''
  const values = points.map(point => point.balance)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const xStep = points.length > 1 ? width / (points.length - 1) : width
  const y = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2)
  const coords = points.map((point, index) => [index * xStep, y(point.balance)] as const)

  return coords.map(([x, value], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${value.toFixed(1)}`).join(' ')
}

export function balanceAreaPath(points: BalancePoint[], width = 800, height = 220, padding = 18): string {
  const line = balancePath(points, width, height, padding)
  if (!line) return ''
  return `${line} L ${width} ${height} L 0 ${height} Z`
}
