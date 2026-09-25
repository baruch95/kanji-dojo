import { describe, expect, it } from 'vitest'
import { calibrationDataset, curriculumDataset, parseDataset } from '../src/data/loader'
import { evaluate, limitsForAccuracy } from '../src/matching/matcher'
import type { CapturedStroke, Point } from '../src/domain/handwriting'

const capture = (points: readonly Point[]): CapturedStroke => ({ pointerType: 'pen', points: points.map((point, t) => ({ ...point, t })) })
const ten = calibrationDataset.items.find((item) => item.character === '十')!
const exact = ten.strokes.map((stroke) => capture(stroke.samples))
const result = (attempt: readonly CapturedStroke[], accuracy = 50) => evaluate(ten.strokes, attempt, accuracy)

describe('M2 dataset and matcher', () => {
  it('loads ten unique canonical references with a source join', () => {
    expect(calibrationDataset.items).toHaveLength(10)
    expect(calibrationDataset.items.every((item) => item.strokeCount === item.strokes.length)).toBe(true)
    expect(() => parseDataset({ ...calibrationDataset, items: [...calibrationDataset.items.slice(0, 9), calibrationDataset.items[0]] })).toThrow(/uniqueness/)
  })

  it('validates the fifty-card curriculum and accepts every canonical reference', () => {
    expect(curriculumDataset.items).toHaveLength(50)
    expect(new Set(curriculumDataset.items.map((item) => item.id)).size).toBe(50)
    for (const item of curriculumDataset.items) {
      const strokes = item.strokes.map((reference) => capture(reference.samples))
      expect(evaluate(item.strokes, strokes, 50)).toMatchObject({ kind: 'match', result: { accepted: true } })
    }
  })

  it('keeps processing faults and empty input out of wrong-answer verdicts', () => {
    expect(result([])).toEqual({ kind: 'unsubmitted' })
    expect(result(exact, -1)).toEqual({ kind: 'processing-error', code: 'invalid-config' })
    expect(result([{ pointerType: 'pen', points: [{ x: NaN, y: 0, t: 0 }] }])).toEqual({ kind: 'processing-error', code: 'invalid-attempt' })
    expect(evaluate([], exact, 50)).toEqual({ kind: 'processing-error', code: 'invalid-reference' })
  })

  it('accepts canonical geometry and rejects count, reversal, swap, and degenerate marks at every strictness', () => {
    for (const accuracy of [0, 50, 100]) {
      expect(result(exact, accuracy)).toMatchObject({ kind: 'match', result: { accepted: true } })
      for (const attempt of [exact.slice(0, 1), [capture([...ten.strokes[0]!.samples].reverse()), exact[1]!], [exact[1]!, exact[0]!], [capture([{ x: 0.5, y: 0.5 }]), exact[1]!]]) {
        expect(result(attempt, accuracy)).toMatchObject({ kind: 'match', result: { accepted: false } })
      }
    }
  })

  it('accepts every generated reference and rejects an unmistakable reversed first stroke', () => {
    for (const item of calibrationDataset.items) {
      const strokes = item.strokes.map((reference) => capture(reference.samples))
      expect(evaluate(item.strokes, strokes, 50)).toMatchObject({ kind: 'match', result: { accepted: true } })
      const reversed = [capture([...item.strokes[0]!.samples].reverse()), ...strokes.slice(1)]
      expect(evaluate(item.strokes, reversed, 0)).toMatchObject({ kind: 'match', result: { accepted: false } })
    }
  })

  it('preserves whole-character position and monotonic strictness', () => {
    const shifted = exact.map((stroke) => capture(stroke.points.map((point) => ({ x: point.x + 0.15, y: point.y, t: point.t }))))
    expect(result(shifted, 100)).toMatchObject({ kind: 'match', result: { accepted: false } })
    for (let accuracy = 1; accuracy <= 100; accuracy++) {
      const previous = limitsForAccuracy(accuracy - 1)
      const current = limitsForAccuracy(accuracy)
      expect(Object.keys(current).every((key) => current[key as keyof typeof current] <= previous[key as keyof typeof previous])).toBe(true)
      if (result(shifted, accuracy).kind === 'match' && result(shifted, accuracy - 1).kind === 'match') {
        const currentResult = result(shifted, accuracy)
        const previousResult = result(shifted, accuracy - 1)
        if (currentResult.kind === 'match' && previousResult.kind === 'match' && currentResult.result.accepted) expect(previousResult.result.accepted).toBe(true)
      }
    }
  })

  it('accepts modest whole-character drift at the new default but still rejects gross displacement', () => {
    const modest = exact.map((stroke) => capture(stroke.points.map((point) => ({ x: point.x + 0.125, y: point.y, t: point.t }))))
    const gross = exact.map((stroke) => capture(stroke.points.map((point) => ({ x: point.x + 0.4, y: point.y, t: point.t }))))
    expect(result(modest, 50)).toMatchObject({ kind: 'match', result: { accepted: true } })
    expect(result(modest, 100)).toMatchObject({ kind: 'match', result: { accepted: false } })
    expect(result(gross, 0)).toMatchObject({ kind: 'match', result: { accepted: false } })
  })
})
