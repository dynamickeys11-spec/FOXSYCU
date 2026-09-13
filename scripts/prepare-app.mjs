import fs from 'node:fs'

const appPath = 'src/AppLedger.tsx'
const canonicalPath = 'src/CanonicalLedgerApp.tsx'
const mainPath = 'src/main.tsx'
const app = fs.readFileSync(appPath, 'utf8')
const canonical = fs.readFileSync(canonicalPath, 'utf8')
const main = fs.readFileSync(mainPath, 'utf8')

if (!app.includes("./CanonicalLedgerApp")) {
  throw new Error('FOXSYCU AppLedger must delegate to the canonical live banking application.')
}

if (!canonical.includes("from './CustomerProvider'") || !canonical.includes("from './supabaseClient'")) {
  throw new Error('FOXSYCU canonical banking UI must use the live Supabase customer data layer.')
}

if (!main.includes("./TransferCenterV3") || !main.includes("./CardsCenterV5")) {
  throw new Error('FOXSYCU main routing must use the live transfer and card implementations.')
}

if (main.includes('StatementsCenterV3') || canonical.includes('Statements & documents')) {
  throw new Error('FOXSYCU customer UI must not expose the removed statements/documents feature.')
}

console.log('FOXSYCU: canonical live banking UI verified.')
