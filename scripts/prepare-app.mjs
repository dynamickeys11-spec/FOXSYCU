import fs from 'node:fs'

const mainPath = 'src/main.tsx'
const main = fs.readFileSync(mainPath, 'utf8')

if (main.includes("./CanonicalLedgerApp") || main.includes('CanonicalLedgerApp')) {
  throw new Error('FOXSYCU must not load the retired competing customer application.')
}

for (const required of ["./CustomerProvider", "./TransferCenterV4", "./CardsCenterV5", "./FNCUHome", "./ProfilePage"]) {
  if (!main.includes(required)) throw new Error(`FOXSYCU main routing is missing required live module: ${required}`)
}

if (main.includes('StatementsCenterV3')) {
  throw new Error('FOXSYCU customer UI must not expose the removed statements/documents feature.')
}

console.log('FOXSYCU: active customer application verified; retired canonical UI is not loaded.')
