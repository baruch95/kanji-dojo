import rawDataset from './generated/calibration-v1.json'
import rawCurriculum from './generated/curriculum-v1.json'
import type { KanjiDefinition, Point, ReferenceStroke } from '../domain/handwriting'

type RecordValue = Record<string, unknown>
const record = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const fail = (message: string): never => { throw new Error(`Invalid dataset: ${message}`) }

export type Provenance = Readonly<{
  id: string
  upstreamUrl: string
  sourceRevision: string
  sourceFilename: string
  sha256: string
  licenseId: string
  licenseUrl: string
  attribution: string
  transformations: string
  metadataVerificationSource: string
  metadataVerificationDate: string | null
}>
export type KanjiDataset = Readonly<{
  schemaVersion: 1
  datasetVersion: string
  generatedByVersion: string
  sourceRevision: string
  items: readonly KanjiDefinition[]
  provenance: readonly Provenance[]
}>

function point(value: unknown): Point {
  if (!record(value) || !finite(value.x) || !finite(value.y) || value.x < -0.001 || value.x > 1.001 || value.y < -0.001 || value.y > 1.001) return fail('point')
  return { x: value.x, y: value.y }
}
function stroke(value: unknown, index: number): ReferenceStroke {
  if (!record(value) || value.index !== index || !nonempty(value.pathD) || !Array.isArray(value.samples) || value.samples.length !== 64 || !finite(value.length) || value.length <= 0) return fail('stroke')
  return { index, pathD: value.pathD, samples: value.samples.map(point), length: value.length }
}
function item(value: unknown): KanjiDefinition {
  if (!record(value) || typeof value.character !== 'string' || [...value.character].length !== 1 || !/^[\p{Script=Han}]$/u.test(value.character)) return fail('character')
  const expectedId = `u${value.character.codePointAt(0)!.toString(16).padStart(4, '0')}`
  if (value.id !== expectedId || !Number.isInteger(value.curriculumOrder) || !finite(value.curriculumOrder) || value.curriculumOrder < 1 || !nonempty(value.promptMeaning) || value.promptMeaning.includes(value.character) || !Array.isArray(value.readings) || value.readings.length === 0 || !value.readings.some((reading: unknown) => record(reading) && reading.showInPrompt === true) || !Array.isArray(value.viewBox) || value.viewBox.length !== 4 || !value.viewBox.every(finite) || !finite(value.viewBox[2]) || !finite(value.viewBox[3]) || value.viewBox[2] <= 0 || value.viewBox[2] !== value.viewBox[3] || !Array.isArray(value.strokes) || value.strokes.length === 0 || value.strokeCount !== value.strokes.length || !nonempty(value.provenanceId)) return fail('item')
  const readings = value.readings.map((reading: unknown) => {
    if (!record(reading) || !nonempty(reading.kana) || !/^[\p{Script=Hiragana}ー]+$/u.test(reading.kana) || !['on', 'kun'].includes(String(reading.kind)) || typeof reading.showInPrompt !== 'boolean') return fail('reading')
    return { kana: reading.kana, kind: reading.kind as 'on' | 'kun', showInPrompt: reading.showInPrompt }
  })
  const viewBox: [number, number, number, number] = [value.viewBox[0]!, value.viewBox[1]!, value.viewBox[2]!, value.viewBox[3]!]
  return { id: expectedId as `u${string}`, character: value.character, curriculumOrder: value.curriculumOrder, promptMeaning: value.promptMeaning, readings, strokeCount: value.strokeCount, viewBox, strokes: value.strokes.map(stroke), provenanceId: value.provenanceId }
}

/** Parse checked-in generated content before exposing it to application code. */
export function parseDataset(value: unknown, expectedCount = 10): KanjiDataset {
  if (!record(value) || value.schemaVersion !== 1 || !nonempty(value.datasetVersion) || !nonempty(value.generatedByVersion) || !nonempty(value.sourceRevision) || !Array.isArray(value.items) || value.items.length !== expectedCount || !Array.isArray(value.provenance) || value.provenance.length !== expectedCount) return fail('wrapper')
  const items = value.items.map(item)
  const provenance = value.provenance.map((entry: unknown): Provenance => {
    if (!record(entry) || !['id', 'upstreamUrl', 'sourceRevision', 'sourceFilename', 'sha256', 'licenseId', 'licenseUrl', 'attribution', 'transformations', 'metadataVerificationSource'].every((key) => nonempty(entry[key])) || (entry.metadataVerificationDate !== null && !nonempty(entry.metadataVerificationDate))) return fail('provenance')
    return {
      id: entry.id as string, upstreamUrl: entry.upstreamUrl as string, sourceRevision: entry.sourceRevision as string,
      sourceFilename: entry.sourceFilename as string, sha256: entry.sha256 as string, licenseId: entry.licenseId as string,
      licenseUrl: entry.licenseUrl as string, attribution: entry.attribution as string, transformations: entry.transformations as string,
      metadataVerificationSource: entry.metadataVerificationSource as string, metadataVerificationDate: entry.metadataVerificationDate as string | null,
    }
  })
  if (new Set(items.map((entry) => entry.id)).size !== items.length || new Set(items.map((entry) => entry.curriculumOrder)).size !== items.length || new Set(provenance.map((entry) => entry.id)).size !== provenance.length || items.some((entry) => !provenance.some((source) => source.id === entry.provenanceId && source.sourceRevision === value.sourceRevision))) return fail('joins or uniqueness')
  return { schemaVersion: 1, datasetVersion: value.datasetVersion, generatedByVersion: value.generatedByVersion, sourceRevision: value.sourceRevision, items, provenance }
}

export const calibrationDataset = parseDataset(rawDataset)
export const curriculumDataset = parseDataset(rawCurriculum, 50)
