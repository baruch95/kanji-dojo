import { describe, expect, it } from 'vitest'
import { tenDefinition } from '../src/data/generated/ten'
import { evaluateBasic, resample } from '../src/matching/basicMatcher'
import type { CapturedStroke, Point } from '../src/domain/handwriting'

const reference = tenDefinition.strokes
const stroke = (points: readonly Point[]): CapturedStroke => ({ pointerType: 'pen', points: points.map((point, index) => ({ ...point, t: index })) })
const canonical = reference.map((item) => stroke(item.samples))

describe('M1 ordered comparison', () => {
  it('accepts reference-shaped strokes with different event sampling density', () => {
    expect(evaluateBasic(reference, canonical).accepted).toBe(true)
    const sparse = reference.map((item) => stroke(item.samples.filter((_, index) => index % 4 === 0 || index === 63)))
    expect(evaluateBasic(reference, sparse).accepted).toBe(true)
  })

  it('rejects reversed, swapped, missing, and degenerate strokes', () => {
    expect(evaluateBasic(reference, [stroke([...reference[0]!.samples].reverse()), canonical[1]!]).diagnostics[0]?.code).toBe('direction')
    expect(evaluateBasic(reference, [canonical[1]!, canonical[0]!]).diagnostics.some((item) => item.code === 'order')).toBe(true)
    expect(evaluateBasic(reference, [canonical[0]!]).diagnostics[0]?.code).toBe('stroke-count')
    expect(evaluateBasic(reference, [stroke([{ x: 0.5, y: 0.5 }]), canonical[1]!]).diagnostics[0]?.code).toBe('degenerate')
  })

  it('preserves endpoints and finite resampling for duplicate points', () => {
    const samples = resample([{ x: 0.1, y: 0.2 }, { x: 0.1, y: 0.2 }, { x: 0.9, y: 0.8 }])
    expect(samples[0]).toEqual({ x: 0.1, y: 0.2 })
    expect(samples.at(-1)).toEqual({ x: 0.9, y: 0.8 })
    expect(samples.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true)
  })
})
