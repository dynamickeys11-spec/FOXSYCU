import fs from 'node:fs'

const canonicalPath = 'src/CanonicalLedgerApp.tsx'
const mainPath = 'src/main.tsx'
const canonical = fs.readFileSync(canonicalPath, 'utf8')
const main = fs.readFileSync(mainPath, 'utf8')

if (!canonical.includes("from './CustomerProvider'") || !canonical.includes("from './supabaseClient'")) {
  throw new Error('FOXSYCU canonical banking UI must use the live Supabase customer data layer.')
}

if (!main.includes("./CanonicalLedgerApp") || !main.includes("./TransferCenterV3") || !main.includes("./CardsCenterV5")) {
  throw new Error('FOXSYCU main routing must use the canonical live banking application and live transfer/card implementations.')
}

if (main.includes('StatementsCenterV3') || canonical.includes('Statements & documents')) {
  throw new Error('FOXSYCU customer UI must not expose the removed statements/documents feature.')
}

console.log('FOXSYCU: canonical live banking UI verified.')
