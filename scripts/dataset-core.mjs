import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'
import { svgPathProperties } from 'svg-path-properties'

export const SOURCE_REVISION = '422b5538595676da918c288a4230cb5e22a1ee7e'
export const DATASET_VERSION = 'calibration-10-v1'
export const GENERATOR_VERSION = 'm2-adapter-1'
export const SOURCE_HASHES = Object.freeze({
  '04e00.svg': '3dd10544e685a2e06184ca52ac2df5d881d4b92b566b94ada976f48d9e3625e4',
  '04e09.svg': '0dbc281bfc51519d2f720e2c105708f4a522951c90209854352a7d2ce221cc85',
  '04e8c.svg': '1c7d7dc8debe863606adc2669eac3daf0adc17b10442bd3d370a0c2697dc52a7',
  '04eba.svg': '0022556d593c1edf00e707f9c0bca1f1b6a531cf0a3a95ccade8931c31b4148d',
  '05341.svg': '3a949bec637d519d51c89d2720cc4db11d7e645f4573b93aee8ecf0e316e9daa',
  '05927.svg': 'f0c66786a7c60ef02d7309ff90b4580c3ed0034dc629cedd0f4e2e5c06549eac',
  '065e5.svg': 'e2b461dad3b8c2a7bb1a5b9318e83d90f44d9f62d903d4a27e5992e6469773b1',
  '06708.svg': 'c577d9e0fb74f01e63ebfa111c1f29834808d375391e32c2a7e0ee8592ae5524',
  '06728.svg': '8ad9a1fa18fe9d0910db9686e7b05f11784650b46aec4795ac67696cc5197acd',
  '06c34.svg': '17025cc265555ea3172b361fee740e58f178c7ed61fb7d1c7124175358f2d41e',
})

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const number = (value) => typeof value === 'number' && Number.isFinite(value)
const round = (value) => Number(value.toFixed(6))

export function parseReference(xml, entry) {
  // KanjiVG's pinned files carry a DTD for kvg attributes. Refuse entity declarations
  // and remove that DTD before XML parsing; jsdom never receives an external URL.
  if (/<!ENTITY\b/i.test(xml)) throw new Error('XML entities are unsupported')
  const doctype = /<!DOCTYPE svg PUBLIC "-\/\/W3C\/\/DTD SVG 1\.0\/\/EN" "http:\/\/www\.w3\.org\/TR\/2001\/REC-SVG-20010904\/DTD\/svg10\.dtd" \[[\s\S]*?\]>/
  const sanitized = xml.replace(doctype, '')
  if (/<!DOCTYPE/i.test(sanitized)) throw new Error('Unsupported XML doctype')
  const document = new JSDOM(sanitized, { contentType: 'image/svg+xml' }).window.document
  const svg = document.documentElement
  if (svg.localName !== 'svg') throw new Error('Missing SVG root')
  const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
  if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !number(value)) || viewBox[2] <= 0 || viewBox[2] !== viewBox[3]) throw new Error('Unsupported viewBox')
  const hex = entry.character.codePointAt(0).toString(16).padStart(5, '0')
  const groups = [...svg.querySelectorAll('g')].filter((group) => group.getAttribute('id') === `kvg:StrokePaths_${hex}`)
  if (groups.length !== 1) throw new Error('StrokePaths group missing or duplicate')
  for (let parent = groups[0].parentElement; parent; parent = parent.parentElement) if (parent.hasAttribute('transform')) throw new Error('Transforms are unsupported')
  if (groups[0].matches('[transform]') || groups[0].querySelector('[transform]')) throw new Error('Transforms are unsupported')
  const elements = [...groups[0].querySelectorAll('*')]
  if (elements.some((element) => !['g', 'path'].includes(element.localName))) throw new Error('Unexpected geometry element')
  const paths = elements.filter((element) => element.localName === 'path')
  if (paths.length === 0) throw new Error('No strokes')
  const strokes = paths.map((path, index) => {
    if (path.getAttribute('id') !== `kvg:${hex}-s${index + 1}`) throw new Error('Noncontiguous stroke ID')
    const d = path.getAttribute('d')
    if (!d || !/^\s*M(?=[\s\d+.-])/.test(d) || (d.match(/[Mm]/g)?.length ?? 0) !== 1 || [...d.matchAll(/[A-Za-z]/g)].some(([command]) => !['M', 'C', 'c', 'S', 's'].includes(command))) throw new Error('Unsupported path command or subpath')
    // The ten canonical paths use M, C/c, and one S/s smooth cubic.
    if (/[^\d\s.,+\-MCcSs]/.test(d) || /(?:^|[,\s])(?:NaN|Infinity)/.test(d)) throw new Error('Unsupported path syntax')
    const segments = d.match(/[MCcSs][^MCcSs]*/g)
    if (!segments || segments.join('') !== d.trim() || segments[0][0] !== 'M') throw new Error('Malformed path segments')
    for (const segment of segments) {
      const operands = segment.slice(1).match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g) ?? []
      const rest = segment.slice(1).replace(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g, '').replace(/[\s,]/g, '')
      if (rest || operands.length !== (segment[0] === 'M' ? 2 : 'Ss'.includes(segment[0]) ? 4 : 6)) throw new Error('Malformed path operands')
    }
    const geometry = new svgPathProperties(d)
    const rawLength = geometry.getTotalLength()
    if (!number(rawLength) || rawLength <= 0) throw new Error('Invalid path length')
    const pointAt = (fraction) => {
      const point = geometry.getPointAtLength(rawLength * fraction)
      const normalized = { x: (point.x - viewBox[0]) / viewBox[2], y: (point.y - viewBox[1]) / viewBox[3] }
      if (!number(normalized.x) || !number(normalized.y) || normalized.x < -0.001 || normalized.x > 1.001 || normalized.y < -0.001 || normalized.y > 1.001) throw new Error('Out-of-frame path')
      return normalized
    }
    for (let sample = 0; sample <= 512; sample++) pointAt(sample / 512)
    return {
      index,
      pathD: d,
      samples: Array.from({ length: 64 }, (_, sample) => {
        const point = pointAt(sample / 63)
        return { x: round(point.x), y: round(point.y) }
      }),
      length: round(rawLength / viewBox[2]),
    }
  })
  return { viewBox, strokes }
}

export function generateDataset(metadata, sources) {
  if (!Array.isArray(metadata) || metadata.length !== 10) throw new Error('Expected ten metadata records')
  const characters = new Set()
  const orders = new Set()
  const ids = new Set()
  const provenance = []
  const items = metadata.map((entry) => {
    if (typeof entry.character !== 'string' || [...entry.character].length !== 1 || !/^[\p{Script=Han}]$/u.test(entry.character) || typeof entry.meaning !== 'string' || !entry.meaning.trim() || entry.meaning.includes(entry.character) || typeof entry.kana !== 'string' || !/^[\p{Script=Hiragana}ー]+$/u.test(entry.kana) || !['on', 'kun'].includes(entry.readingKind) || !Number.isInteger(entry.order) || entry.order < 1 || !/^0[0-9a-f]{4}\.svg$/.test(entry.source)) throw new Error('Invalid metadata')
    const hex = entry.character.codePointAt(0).toString(16).padStart(5, '0')
    if (entry.source !== `${hex}.svg` || characters.has(entry.character) || orders.has(entry.order)) throw new Error('Duplicate or mismatched metadata')
    characters.add(entry.character)
    orders.add(entry.order)
    const xml = sources.get(entry.source)
    if (!xml) throw new Error(`Missing source ${entry.source}`)
    if (sha256(xml) !== SOURCE_HASHES[entry.source]) throw new Error(`Pinned source hash changed: ${entry.source}`)
    const id = `u${entry.character.codePointAt(0).toString(16).padStart(4, '0')}`
    if (ids.has(id)) throw new Error('Duplicate ID')
    ids.add(id)
    const geometry = parseReference(xml, entry)
    const provenanceId = `kanjivg-${hex}-${SOURCE_REVISION.slice(0, 8)}`
    provenance.push({
      id: provenanceId, upstreamUrl: `https://github.com/KanjiVG/kanjivg/blob/${SOURCE_REVISION}/kanji/${entry.source}`,
      sourceRevision: SOURCE_REVISION, sourceFilename: entry.source, sha256: sha256(xml),
      licenseId: 'CC-BY-SA-3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      attribution: 'KanjiVG / Ulrich Apel', transformations: 'StrokePaths only; normalized 109-square path samples and lengths',
      metadataVerificationSource: 'docs/dataset-spec.md candidate table; editorial review pending M6', metadataVerificationDate: null,
    })
    return {
      id, character: entry.character, curriculumOrder: entry.order, promptMeaning: entry.meaning,
      readings: [{ kana: entry.kana, kind: entry.readingKind, showInPrompt: true }],
      strokeCount: geometry.strokes.length, viewBox: geometry.viewBox, strokes: geometry.strokes, provenanceId,
    }
  })
  return { schemaVersion: 1, datasetVersion: DATASET_VERSION, generatedByVersion: GENERATOR_VERSION, sourceRevision: SOURCE_REVISION, items, provenance }
}
