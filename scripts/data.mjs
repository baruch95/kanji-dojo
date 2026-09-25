import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { URL } from 'node:url'
import { generateDataset } from './dataset-core.mjs'

const root = new URL('../', import.meta.url)
const metadata = JSON.parse(await readFile(new URL('data/metadata.json', root), 'utf8'))
const sourceHashes = JSON.parse(await readFile(new URL('data/source-hashes.json', root), 'utf8'))
const sources = new Map()
for (const entry of metadata) sources.set(entry.source, await readFile(new URL(`data/sources/kanjivg/${entry.source}`, root), 'utf8'))
const calibration = new Set(['十', '一', '二', '三', '人', '大', '日', '月', '水', '木'])
const outputs = [
  ['src/data/generated/calibration-v1.json', `${JSON.stringify(generateDataset(metadata.filter((entry) => calibration.has(entry.character)), sources, sourceHashes), null, 2)}\n`],
  ['src/data/generated/curriculum-v1.json', `${JSON.stringify(generateDataset(metadata, sources, sourceHashes, 'curriculum'), null, 2)}\n`],
]
if (process.argv[2] === 'validate') {
  for (const [filename, output] of outputs) if (await readFile(new URL(filename, root), 'utf8') !== output) throw new Error(`${filename} differs; run npm run data:generate`)
  process.stdout.write('Ten-character and 50-character datasets valid and reproducible\n')
} else if (process.argv[2] === 'generate') {
  for (const [filename, output] of outputs) await writeFile(new URL(filename, root), output)
  process.stdout.write('Generated ten-character and 50-character datasets\n')
} else throw new Error('Expected generate or validate')
