import { expect, it } from 'vitest'
import { transition } from '../src/domain/learning'
import type { Progress } from '../src/domain/state'
import { applyRating, initializeCard } from '../src/scheduling/fsrsAdapter'

const at = 1_780_000_000_000
const cardId = 'writing:u5341:v1' as const
const learning = (reason: 'initial' | 'lapse', step: 'trace' | 'copy' | 'recall'): Progress => ({ cardId, mode: 'learning', reason, step, schedulerCard: reason === 'lapse' ? initializeCard(at) : null, createdAt: at, updatedAt: at })

it('advances trace, copy, recall and returns failures to trace', () => {
  for (const reason of ['initial', 'lapse'] as const) {
    expect(transition(learning(reason, 'trace'), true).next).toEqual({ mode: 'learning', reason, step: 'copy' })
    expect(transition(learning(reason, 'copy'), true).next).toEqual({ mode: 'learning', reason, step: 'recall' })
    for (const step of ['trace', 'copy', 'recall'] as const) {
      expect(transition(learning(reason, step), false)).toEqual({ next: { mode: 'learning', reason, step: 'trace' }, rating: null, complete: false })
    }
  }
})

it('rates only initial graduation and scheduled review; lapse graduation has no extra Good', () => {
  expect(transition(learning('initial', 'recall'), true)).toMatchObject({ rating: 'Good', complete: true })
  expect(transition(learning('lapse', 'recall'), true)).toMatchObject({ rating: null, complete: true })
  const review: Progress = { cardId, mode: 'review', schedulerCard: initializeCard(at), createdAt: at, updatedAt: at }
  expect(transition(review, true)).toMatchObject({ rating: 'Good', complete: true })
  expect(transition(review, false)).toMatchObject({ rating: 'Again', complete: false, next: { mode: 'learning', reason: 'lapse', step: 'trace' } })
})

it('serializes full FSRS cards and logs with stable due times', () => {
  const first = applyRating(initializeCard(at), 'Good', at)
  expect(first.card.card.due).toBeGreaterThan(at)
  expect(first.log.rating).toBe(3)
  const lapse = applyRating(first.card, 'Again', at + 86_400_000)
  expect(lapse.log.rating).toBe(1)
  expect(lapse.card.card.due).toBeGreaterThan(at + 86_400_000)
  expect(() => applyRating(lapse.card, 'Good', at)).toThrow(/Clock/)
})
