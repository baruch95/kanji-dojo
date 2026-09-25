import type { Progress, LearningStep } from './state'

export type LearningPlan = Readonly<{
  next: { mode: 'learning'; reason: 'initial' | 'lapse'; step: LearningStep } | { mode: 'review' }
  rating: 'Good' | 'Again' | null
  complete: boolean
}>

/** Pure learning transition; the scheduler card is applied by orchestration. */
export function transition(progress: Progress, accepted: boolean): LearningPlan {
  if (progress.mode === 'review') {
    return accepted
      ? { next: { mode: 'review' }, rating: 'Good', complete: true }
      : { next: { mode: 'learning', reason: 'lapse', step: 'trace' }, rating: 'Again', complete: false }
  }
  if (!accepted) return { next: { mode: 'learning', reason: progress.reason, step: 'trace' }, rating: null, complete: false }
  if (progress.step === 'trace') return { next: { mode: 'learning', reason: progress.reason, step: 'copy' }, rating: null, complete: false }
  if (progress.step === 'copy') return { next: { mode: 'learning', reason: progress.reason, step: 'recall' }, rating: null, complete: false }
  return { next: { mode: 'review' }, rating: progress.reason === 'initial' ? 'Good' : null, complete: true }
}
