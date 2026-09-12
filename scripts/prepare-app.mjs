import fs from 'node:fs'

const path = 'src/App.tsx'
const source = fs.readFileSync(path, 'utf8')

if (!source.includes("from './data/runtimeBanking'")) {
  throw new Error('FOXSYCU App.tsx must include the runtime banking integration before build.')
}

// The application is now explicitly wired in source. Keep this preparation step
// as a validation gate rather than mutating App.tsx during every build.
console.log('FOXSYCU: source-integrated banking UI verified.')
