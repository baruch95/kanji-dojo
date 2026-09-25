// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { parseReference } from '../scripts/dataset-core.mjs'

const source = readFileSync(new URL('../data/sources/kanjivg/05341.svg', import.meta.url), 'utf8')
const entry = { character: '十' }

describe('KanjiVG conversion failures', () => {
  it('extracts only the ordered stroke paths', () => {
    const reference = parseReference(source, entry)
    expect(reference.strokes).toHaveLength(2)
    expect(reference.strokes[0].samples).toHaveLength(64)
  })
  it('rejects entities, transforms, extra subpaths, and noncontiguous IDs', () => {
    expect(() => parseReference(source.replace('<svg ', '<!ENTITY x SYSTEM "https://example.com/x"><svg '), entry)).toThrow(/entities/)
    expect(() => parseReference(source.replace('kvg:StrokePaths_05341"', 'kvg:StrokePaths_05341" transform="scale(2)"'), entry)).toThrow(/Transforms/)
    expect(() => parseReference(source.replace('M11.88,50.98', 'M11.88,50.98M1,1'), entry)).toThrow(/subpath/)
    expect(() => parseReference(source.replace('05341-s2', '05341-s3'), entry)).toThrow(/stroke ID/)
  })
})
