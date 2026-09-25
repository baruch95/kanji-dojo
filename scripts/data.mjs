import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { URL } from 'node:url'
import { generateDataset } from './dataset-core.mjs'

const root = new URL('../', import.meta.url)
const metadata = JSON.parse(await readFile(new URL('data/metadata.json', root), 'utf8'))
const sources = new Map()
for (const entry of metadata) sources.set(entry.source, await readFile(new URL(`data/sources/kanjivg/${entry.source}`, root), 'utf8'))
const output = `${JSON.stringify(generateDataset(metadata, sources), null, 2)}\n`
const destination = new URL('src/data/generated/calibration-v1.json', root)
if (process.argv[2] === 'validate') {
  if (await readFile(destination, 'utf8') !== output) throw new Error('Generated dataset differs; run npm run data:generate')
  process.stdout.write('Ten-character dataset valid and reproducible\n')
} else if (process.argv[2] === 'generate') {
  await writeFile(destination, output)
  process.stdout.write('Generated ten-character dataset\n')
} else throw new Error('Expected generate or validate')
