import { expect, it } from 'vitest'
import { curriculumDataset } from '../src/data/loader'
import { planSession, writingCardId } from '../src/domain/sessionPlanner'
import type { Progress } from '../src/domain/state'
import { applyRating, initializeCard } from '../src/scheduling/fsrsAdapter'

const at = 1_780_000_000_000
const first = curriculumDataset.items[0]!
const second = curriculumDataset.items[1]!
const third = curriculumDataset.items[2]!
const dueCard = applyRating(initializeCard(at - 86_400_000), 'Good', at - 86_400_000).card
const progress: Progress[] = [
  { cardId: writingCardId(first.id), mode: 'learning', reason: 'initial', step: 'copy', schedulerCard: null, createdAt: at - 20_000, updatedAt: at - 10_000 },
  { cardId: writingCardId(second.id), mode: 'review', schedulerCard: { ...dueCard, card: { ...dueCard.card, due: at } }, createdAt: at - 50_000, updatedAt: at - 40_000 },
]

it('uses due equality and unique unfinished-review-new ordering', () => {
  const { counts, queue } = planSession([first, second, third], progress, { reviews: 5, newCards: 5, includeUnfinished: true }, at)
  expect(counts).toEqual({ due: 1, unfinished: 1, newAvailable: 1 })
  expect(queue.map((item) => item.category)).toEqual(['unfinished', 'review', 'new'])
  expect(queue.map((item) => item.cardId)).toEqual([writingCardId(first.id), writingCardId(second.id), writingCardId(third.id)])
  expect(planSession([first, second, third], progress, { reviews: 0, newCards: 0, includeUnfinished: false }, at).queue).toHaveLength(0)
  expect(planSession([first, second, third], progress, { reviews: 'all', newCards: 0, includeUnfinished: false }, at - 1).counts.due).toBe(0)
})
