import fs from 'node:fs'

const canonicalPath = 'src/CanonicalLedgerApp.tsx'
const mainPath = 'src/main.tsx'
const canonical = fs.readFileSync(canonicalPath, 'utf8')
const main = fs.readFileSync(mainPath, 'utf8')

if (!canonical.includes("from './CustomerProvider'") || !canonical.includes("from './supabaseClient'")) {
  throw new Error('FOXSYCU canonical banking UI must use the live Supabase customer data layer.')
}

if (!main.includes("./CanonicalLedgerApp") || !main.includes("./TransferCenterV4") || !main.includes("./CardsCenterV5")) {
  throw new Error('FOXSYCU main routing must use the canonical live banking application and live transfer/card implementations.')
}

if (main.includes('StatementsCenterV3') || canonical.includes('Statements & documents')) {
  throw new Error('FOXSYCU customer UI must not expose the removed statements/documents feature.')
}

// CanonicalLedgerApp receives Transaction objects whose status is already normalized
// by CustomerProvider (for example "Completed"). Do not pass those labels through a
// lowercase-only database mapper, or every non-lowercase status becomes Reversed.
const unsafe = "status:row.status==='completed'?'Completed':row.status==='pending'?'Pending':row.status==='failed'?'Failed':'Reversed'"
const safe = "status:(()=>{const s=String(row.status??'').trim().toLowerCase();if(['completed','complete','posted','settled','processed'].includes(s))return 'Completed';if(s==='pending')return 'Pending';if(s==='failed')return 'Failed';if(['reversed','reversal'].includes(s))return 'Reversed';return 'Review'})()"
if (canonical.includes(unsafe)) {
  fs.writeFileSync(canonicalPath, canonical.replace(unsafe, safe))
  console.log('FOXSYCU: normalized transaction status mapping in the canonical UI.')
} else {
  console.log('FOXSYCU: transaction status mapping already normalized or has changed shape.')
}

console.log('FOXSYCU: canonical live banking UI verified.')
