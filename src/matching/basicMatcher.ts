import type { CapturedStroke, DiagnosticCode, MatchResult, Point, ReferenceStroke } from '../domain/handwriting'

export const MATCHER_VERSION = 'm1-basic-1'

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

/** Arc-length samples in the original whole-character coordinate frame. */
export function resample(points: readonly Point[], count = 64): Point[] {
  if (count < 2 || !Number.isInteger(count) || points.length === 0 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    throw new Error('Invalid stroke samples')
  }
  const clean = points.filter((point, index) => index === 0 || distance(point, points[index - 1]!) > 0)
  if (clean.length === 1) return Array.from({ length: count }, () => clean[0]!)
  const cumulative = [0]
  for (let index = 1; index < clean.length; index++) cumulative.push(cumulative[index - 1]! + distance(clean[index - 1]!, clean[index]!))
  const total = cumulative.at(-1)!
  const samples: Point[] = []
  let segment = 1
  for (let index = 0; index < count; index++) {
    const target = total * index / (count - 1)
    while (segment < cumulative.length - 1 && cumulative[segment]! < target) segment++
    const start = clean[segment - 1]!
    const end = clean[segment]!
    const fraction = (target - cumulative[segment - 1]!) / (cumulative[segment]! - cumulative[segment - 1]!)
    samples.push({ x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction })
  }
  return samples
}

function pathLength(points: readonly Point[]): number {
  let length = 0
  for (let index = 1; index < points.length; index++) length += distance(points[index - 1]!, points[index]!)
  return length
}

function meanDistance(a: readonly Point[], b: readonly Point[]): number {
  return a.reduce((total, point, index) => total + distance(point, b[index]!), 0) / a.length
}

/** M1 proof-of-concept ordered matcher; thresholds require M2 calibration. */
export function evaluateBasic(reference: readonly ReferenceStroke[], attempt: readonly CapturedStroke[]): MatchResult {
  if (reference.length === 0 || reference.some((stroke, index) => stroke.index !== index || stroke.samples.length !== 64 || !Number.isFinite(stroke.length) || stroke.length <= 0 || stroke.samples.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))) {
    throw new Error('Invalid reference geometry')
  }
  if (attempt.some((stroke) => stroke.points.length === 0 || stroke.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.t)))) {
    throw new Error('Invalid attempt geometry')
  }
  if (attempt.length !== reference.length) return { accepted: false, diagnostics: [{ code: 'stroke-count' }], matcherVersion: MATCHER_VERSION }

  const diagnostics: { code: DiagnosticCode; strokeIndex: number }[] = []
  for (let index = 0; index < reference.length; index++) {
    const user = attempt[index]!
    const expected = reference[index]!
    const length = pathLength(user.points)
    if (length < 0.003) {
      diagnostics.push({ code: 'degenerate', strokeIndex: index })
      continue
    }
    const samples = resample(user.points)
    const ordered = meanDistance(samples, expected.samples)
    const otherBest = Math.min(...reference.filter((_, other) => other !== index).map((other) => meanDistance(samples, other.samples)))
    if (Number.isFinite(otherBest) && ordered >= 0.06 && otherBest <= ordered * 0.65 && ordered - otherBest >= 0.04) {
      diagnostics.push({ code: 'order', strokeIndex: index })
      continue
    }
    const userStart = samples[0]!
    const userEnd = samples.at(-1)!
    const refStart = expected.samples[0]!
    const refEnd = expected.samples.at(-1)!
    const ux = userEnd.x - userStart.x
    const uy = userEnd.y - userStart.y
    const rx = refEnd.x - refStart.x
    const ry = refEnd.y - refStart.y
    const userDisplacement = Math.hypot(ux, uy)
    const refDisplacement = Math.hypot(rx, ry)
    if (userDisplacement > 0.04 && refDisplacement > 0.04 && (ux * rx + uy * ry) / (userDisplacement * refDisplacement) < -0.25) {
      diagnostics.push({ code: 'direction', strokeIndex: index })
      continue
    }
    if (distance(userStart, refStart) > 0.16) diagnostics.push({ code: 'start', strokeIndex: index })
    if (distance(userEnd, refEnd) > 0.16) diagnostics.push({ code: 'end', strokeIndex: index })
    if (length / expected.length < 0.5 || length / expected.length > 1.8) diagnostics.push({ code: 'length', strokeIndex: index })
    if (ordered > 0.11) diagnostics.push({ code: 'trajectory', strokeIndex: index })
  }
  return { accepted: diagnostics.length === 0, diagnostics, matcherVersion: MATCHER_VERSION }
}
