import type { CapturedStroke, DiagnosticCode, MatchResult, Point, ReferenceStroke } from '../domain/handwriting'
import { resample } from './basicMatcher'

export const MATCHER_CONFIG_VERSION = 'm2-provisional-2'
export type MatcherOutcome =
  | Readonly<{ kind: 'match'; result: MatchResult }>
  | Readonly<{ kind: 'unsubmitted' }>
  | Readonly<{ kind: 'processing-error'; code: 'invalid-reference' | 'invalid-attempt' | 'invalid-config' }>

type Thresholds = Readonly<{ endpoint: number; mean: number; p90: number; logLength: number; structure: number }>
const knots: readonly Thresholds[] = [
  { endpoint: 0.22, mean: 0.16, p90: 0.24, logLength: 0.90, structure: 0.18 },
  { endpoint: 0.204, mean: 0.148, p90: 0.224, logLength: 0.85, structure: 0.168 },
  { endpoint: 0.07, mean: 0.05, p90: 0.09, logLength: 0.40, structure: 0.07 },
]
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const length = (points: readonly Point[]) => points.slice(1).reduce((sum, point, index) => sum + dist(point, points[index]!), 0)
const mean = (a: readonly Point[], b: readonly Point[]) => a.reduce((sum, point, index) => sum + dist(point, b[index]!), 0) / a.length
const bounds = (strokes: readonly (readonly Point[])[]) => {
  const all = strokes.flat()
  return [Math.min(...all.map((p) => p.x)), Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.x)), Math.max(...all.map((p) => p.y))]
}

/** Piecewise linear strictness; higher accuracy always has lower limits. */
export function limitsForAccuracy(accuracy: number): Thresholds {
  if (!Number.isInteger(accuracy) || accuracy < 0 || accuracy > 100) throw new Error('Invalid accuracy')
  const lower = accuracy <= 50 ? knots[0]! : knots[1]!
  const upper = accuracy <= 50 ? knots[1]! : knots[2]!
  const fraction = (accuracy <= 50 ? accuracy : accuracy - 50) / 50
  return {
    endpoint: lower.endpoint + (upper.endpoint - lower.endpoint) * fraction,
    mean: lower.mean + (upper.mean - lower.mean) * fraction,
    p90: lower.p90 + (upper.p90 - lower.p90) * fraction,
    logLength: lower.logLength + (upper.logLength - lower.logLength) * fraction,
    structure: lower.structure + (upper.structure - lower.structure) * fraction,
  }
}

/** Deterministic ordered target matching. No browser, clock, or state dependencies. */
export function evaluate(reference: readonly ReferenceStroke[], attempt: readonly CapturedStroke[], accuracy: number): MatcherOutcome {
  if (!Number.isInteger(accuracy) || accuracy < 0 || accuracy > 100) return { kind: 'processing-error', code: 'invalid-config' }
  if (reference.length === 0 || reference.some((stroke, index) => stroke.index !== index || stroke.samples.length !== 64 || !Number.isFinite(stroke.length) || stroke.length <= 0 || stroke.samples.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))) return { kind: 'processing-error', code: 'invalid-reference' }
  if (attempt.some((stroke) => !['pen', 'touch', 'mouse'].includes(stroke.pointerType) || stroke.points.length === 0 || stroke.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.t)))) return { kind: 'processing-error', code: 'invalid-attempt' }
  if (attempt.length === 0) return { kind: 'unsubmitted' }
  const diagnostics: { code: DiagnosticCode; strokeIndex?: number }[] = []
  if (attempt.length !== reference.length) diagnostics.push({ code: 'stroke-count' })
  const thresholds = limitsForAccuracy(accuracy)
  const sampled: Point[][] = []
  for (let index = 0; index < Math.min(attempt.length, reference.length); index++) {
    const expected = reference[index]!
    const user = attempt[index]!.points
    const userLength = length(user)
    if (userLength < 0.003) { diagnostics.push({ code: 'degenerate', strokeIndex: index }); continue }
    const samples = resample(user)
    sampled.push(samples)
    const start = dist(samples[0]!, expected.samples[0]!)
    const end = dist(samples[63]!, expected.samples[63]!)
    const ratio = userLength / expected.length
    const distances = samples.map((point, sample) => dist(point, expected.samples[sample]!))
    const forward = distances.reduce((sum, value) => sum + value, 0) / 64
    const reverse = mean(samples, [...expected.samples].reverse())
    const other = Math.min(...reference.filter((_, otherIndex) => otherIndex !== index).map((stroke) => mean(samples, stroke.samples)))
    if (forward >= 0.06 && Number.isFinite(other) && other <= forward * 0.65 && forward - other >= 0.04) { diagnostics.push({ code: 'order', strokeIndex: index }); continue }
    const u = { x: samples[63]!.x - samples[0]!.x, y: samples[63]!.y - samples[0]!.y }
    const r = { x: expected.samples[63]!.x - expected.samples[0]!.x, y: expected.samples[63]!.y - expected.samples[0]!.y }
    const ud = Math.hypot(u.x, u.y)
    const rd = Math.hypot(r.x, r.y)
    if ((ud > 0.04 && rd > 0.04 && (u.x * r.x + u.y * r.y) / (ud * rd) < -0.25) || (forward - reverse >= 0.04 && reverse <= forward * 0.65)) { diagnostics.push({ code: 'direction', strokeIndex: index }); continue }
    if (start > 0.35 || start > thresholds.endpoint) diagnostics.push({ code: 'start', strokeIndex: index })
    if (end > 0.35 || end > thresholds.endpoint) diagnostics.push({ code: 'end', strokeIndex: index })
    if (ratio < 0.15 || ratio > 4 || Math.abs(Math.log(ratio)) > thresholds.logLength) diagnostics.push({ code: 'length', strokeIndex: index })
    const p90 = [...distances].sort((a, b) => a - b)[Math.ceil(0.9 * 64) - 1]!
    if (forward > thresholds.mean || p90 > thresholds.p90) diagnostics.push({ code: 'trajectory', strokeIndex: index })
  }
  if (sampled.length === reference.length && attempt.length === reference.length) {
    const userBounds = bounds(sampled)
    const refBounds = bounds(reference.map((stroke) => stroke.samples))
    if (Math.max(...userBounds.map((value, index) => Math.abs(value - refBounds[index]!))) > thresholds.structure) diagnostics.push({ code: 'structure' })
  }
  return { kind: 'match', result: { accepted: diagnostics.length === 0, diagnostics, matcherVersion: MATCHER_CONFIG_VERSION } }
}
