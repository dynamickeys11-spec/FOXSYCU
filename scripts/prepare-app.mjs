import fs from 'node:fs'

const mainPath = 'src/main.tsx'
const main = fs.readFileSync(mainPath, 'utf8')

if (main.includes("./CanonicalLedgerApp") || main.includes('CanonicalLedgerApp')) {
  throw new Error('FNCU must not load the retired competing customer application.')
}

for (const required of ["./CustomerProvider", "./TransferCenterV2", "./CardsCenterV5", "./FNCUHome", "./ProfilePage"]) {
  if (!main.includes(required)) throw new Error(`FNCU main routing is missing required live module: ${required}`)
}

if (main.includes('StatementsCenterV3')) {
  throw new Error('FNCU customer UI must not expose the removed statements/documents feature.')
}

console.log('FNCU: active customer application verified; retired canonical UI is not loaded.')
