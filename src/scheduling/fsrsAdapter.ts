import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type ReviewLog } from 'ts-fsrs'
import type { StoredCard, StoredLog } from '../domain/scheduler'

export const SCHEDULER_CONFIG_ID = 'ts-fsrs-5.4.2-r90-no-fuzz-no-short-1'
export const SCHEDULER_LIBRARY_VERSION = '5.4.2'
const parameters = generatorParameters({ request_retention: 0.9, enable_fuzz: false, enable_short_term: false })
const engine = fsrs(parameters)
const cardNumbers = ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses'] as const
const logNumbers = ['rating', 'state', 'due', 'stability', 'difficulty', 'elapsed_days', 'last_elapsed_days', 'scheduled_days', 'learning_steps', 'review'] as const
const validDate = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= 8_640_000_000_000_000

export type SchedulerResult = Readonly<{ card: StoredCard; log: StoredLog }>

function serializeCard(card: Card): StoredCard {
  return { engine: 'ts-fsrs', libraryVersion: SCHEDULER_LIBRARY_VERSION, configId: SCHEDULER_CONFIG_ID, card: {
    due: card.due.getTime(), stability: card.stability, difficulty: card.difficulty, elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days, learning_steps: card.learning_steps, reps: card.reps, lapses: card.lapses,
    state: card.state, ...(card.last_review ? { last_review: card.last_review.getTime() } : {}),
  } }
}
function serializeLog(log: ReviewLog): StoredLog {
  return { rating: log.rating, state: log.state, due: log.due.getTime(), stability: log.stability,
    difficulty: log.difficulty, elapsed_days: log.elapsed_days, last_elapsed_days: log.last_elapsed_days,
    scheduled_days: log.scheduled_days, learning_steps: log.learning_steps, review: log.review.getTime() }
}

/** Parse a stored scheduler card without accepting unknown engines or date strings. */
export function parseStoredCard(value: unknown): StoredCard {
  if (typeof value !== 'object' || value === null || !('engine' in value) || !('libraryVersion' in value) || !('configId' in value) || !('card' in value) || value.engine !== 'ts-fsrs' || value.libraryVersion !== SCHEDULER_LIBRARY_VERSION || value.configId !== SCHEDULER_CONFIG_ID || typeof value.card !== 'object' || value.card === null) throw new Error('Unsupported scheduler card')
  const card = value.card as Record<string, unknown>
  if (!validDate(card.due) || !cardNumbers.every((key) => typeof card[key] === 'number' && Number.isFinite(card[key])) || !Number.isInteger(card.state) || ![0, 1, 2, 3].includes(card.state as number) || (card.last_review !== undefined && !validDate(card.last_review))) throw new Error('Corrupt scheduler card')
  return value as StoredCard
}

/** Validate every persisted review-log field before displaying history. */
export function parseStoredLog(value: unknown): StoredLog {
  if (typeof value !== 'object' || value === null || !logNumbers.every((key) => key in value && typeof value[key as keyof typeof value] === 'number' && Number.isFinite(value[key as keyof typeof value])) || !('rating' in value) || ![1, 2, 3, 4].includes(value.rating as number) || !('state' in value) || ![0, 1, 2, 3].includes(value.state as number) || !('due' in value) || !validDate(value.due) || !('review' in value) || !validDate(value.review)) throw new Error('Corrupt scheduler log')
  return value as StoredLog
}

function hydrateCard(value: StoredCard): Card {
  const parsed = parseStoredCard(value).card
  return { ...parsed, due: new Date(parsed.due), last_review: parsed.last_review === undefined ? undefined : new Date(parsed.last_review) } as Card
}

/** Create an unscheduled card only when initial learning graduates. */
export function initializeCard(now: number): StoredCard {
  if (!validDate(now)) throw new Error('Invalid time')
  return serializeCard(createEmptyCard(new Date(now)))
}

/** Apply one Good/Again with a captured UTC time. */
export function applyRating(current: StoredCard, rating: 'Good' | 'Again', now: number): SchedulerResult {
  if (!validDate(now)) throw new Error('Invalid time')
  const card = hydrateCard(current)
  if (card.last_review && now < card.last_review.getTime()) throw new Error('Clock moved backwards')
  const result = engine.next(card, new Date(now), rating === 'Good' ? Rating.Good : Rating.Again)
  return { card: serializeCard(result.card), log: serializeLog(result.log) }
}
