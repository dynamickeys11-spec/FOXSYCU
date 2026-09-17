import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sourcePath = resolve('public/fncu-logo.svg')
const outputPath = resolve('public/fncu-logo.png')
const svg = readFileSync(sourcePath, 'utf8')
const match = svg.match(/data:image\/png;base64,([^"']+)/)

if (!match) {
  throw new Error('Canonical FNCU logo SVG does not contain the expected embedded PNG payload.')
}

writeFileSync(outputPath, Buffer.from(match[1], 'base64'))
console.log(`Extracted canonical FNCU PNG: ${outputPath}`)
