import fs from 'node:fs'

const path = 'src/AppLedger.tsx'
const source = fs.readFileSync(path, 'utf8')

if (!source.includes("from './data/runtimeBanking'")) {
  throw new Error('FOXSYCU AppLedger must include the runtime banking integration before build.')
}

if (!source.includes('FOXSYCU') || !source.includes('John Doe')) {
  throw new Error('FOXSYCU AppLedger must remain the canonical John Doe FOXSYCU banking interface.')
}

console.log('FOXSYCU: canonical AppLedger banking UI verified.')
