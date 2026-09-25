import type { KanjiDefinition, CardId } from './handwriting'
import type { Progress, QueueItem } from './state'

export type Quotas = Readonly<{ reviews: 0 | 5 | 10 | 20 | 'all'; newCards: 0 | 5 | 10; includeUnfinished: boolean }>
export type Counts = Readonly<{ due: number; unfinished: number; newAvailable: number }>
export const DEFAULT_QUOTAS: Quotas = { reviews: 10, newCards: 0, includeUnfinished: true }
export const writingCardId = (id: string): CardId => `writing:${id}:v1` as CardId

/** Counts and frozen queue derive from one content/progress snapshot. */
export function planSession(content: readonly KanjiDefinition[], progress: readonly Progress[], quotas: Quotas, now: number): { counts: Counts; queue: readonly QueueItem[] } {
  if (!Number.isSafeInteger(now) || ![0, 5, 10, 20, 'all'].includes(quotas.reviews) || ![0, 5, 10].includes(quotas.newCards)) throw new Error('Invalid session selection')
  const progressById = new Map(progress.map((item) => [item.cardId, item]))
  const sortedContent = [...content].sort((a, b) => a.curriculumOrder - b.curriculumOrder)
  const unfinished = progress.filter((item) => item.mode === 'learning').sort((a, b) => a.updatedAt - b.updatedAt || a.cardId.localeCompare(b.cardId))
  const due = progress.filter((item) => item.mode === 'review' && item.schedulerCard.card.due <= now).sort((a, b) => a.schedulerCard!.card.due - b.schedulerCard!.card.due || a.cardId.localeCompare(b.cardId))
  const unseen = sortedContent.filter((item) => !progressById.has(writingCardId(item.id)))
  const queue: QueueItem[] = [
    ...(quotas.includeUnfinished ? unfinished.map((item): QueueItem => ({ cardId: item.cardId, category: 'unfinished', completed: false })) : []),
    ...due.slice(0, quotas.reviews === 'all' ? undefined : quotas.reviews).map((item): QueueItem => ({ cardId: item.cardId, category: 'review', completed: false })),
    ...unseen.slice(0, quotas.newCards).map((item): QueueItem => ({ cardId: writingCardId(item.id), category: 'new', completed: false })),
  ]
  if (new Set(queue.map((item) => item.cardId)).size !== queue.length) throw new Error('Duplicate session item')
  return { counts: { due: due.length, unfinished: unfinished.length, newAvailable: unseen.length }, queue }
}
