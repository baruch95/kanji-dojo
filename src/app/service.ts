import type { CapturedStroke, KanjiDefinition } from '../domain/handwriting'
import { transition } from '../domain/learning'
import { planSession, writingCardId, type Quotas } from '../domain/sessionPlanner'
import type { AttemptEvent, Progress, Session, Settings, Snapshot } from '../domain/state'
import { evaluate, MATCHER_CONFIG_VERSION } from '../matching/matcher'
import type { CommitResult, Mutation, Repository } from '../persistence/repository'
import { applyRating, initializeCard } from '../scheduling/fsrsAdapter'

export type Clock = Readonly<{ now(): number }>
export type Ids = Readonly<{ next(): string }>
export type GradePreparation = Readonly<{ kind: 'ready'; command: Extract<Mutation, { kind: 'grade' }>; expectedRevision: number }> | Readonly<{ kind: 'unsubmitted' | 'processing-error' | 'invalid-session'; message: string }>

/** Wires pure transitions to the matcher, scheduler, and atomic repository. */
export class DojoService {
  private readonly byCard: Map<string, KanjiDefinition>
  constructor(private readonly repo: Repository, private readonly content: readonly KanjiDefinition[], private readonly datasetVersion: string, private readonly clock: Clock, private readonly ids: Ids) {
    this.byCard = new Map(content.map((item) => [writingCardId(item.id), item]))
  }

  load(): Promise<Snapshot> { return this.repo.loadSnapshot() }
  preview(snapshot: Snapshot, quotas: Quotas) { return planSession(this.content, snapshot.progress, quotas, this.clock.now()) }

  async start(snapshot: Snapshot, quotas: Quotas): Promise<CommitResult> {
    if (snapshot.activeSessionId !== null) throw new Error('End or resume the active session')
    const now = this.clock.now()
    const { queue } = planSession(this.content, snapshot.progress, quotas, now)
    if (queue.length === 0) throw new Error('Select at least one card')
    const id = this.ids.next()
    const session: Session = { id, status: 'active', startedAt: now, endedAt: null, datasetVersion: this.datasetVersion, matcherVersion: MATCHER_CONFIG_VERSION, accuracy: snapshot.settings.accuracy, fingerDrawing: snapshot.settings.fingerDrawing, queue, currentIndex: 0, attemptId: this.ids.next(), result: null }
    const first = queue[0]!
    const progress = first.category === 'new' ? this.initialProgress(first.cardId, now) : undefined
    return this.repo.commit({ kind: 'start', operationId: this.ids.next(), session, progress, activeSessionId: id }, snapshot.revision)
  }

  prepareGrade(snapshot: Snapshot, strokes: readonly CapturedStroke[]): GradePreparation {
    const session = snapshot.sessions.find((item) => item.id === snapshot.activeSessionId)
    if (!session || session.status !== 'active' || session.result || session.datasetVersion !== this.datasetVersion || session.matcherVersion !== MATCHER_CONFIG_VERSION) return { kind: 'invalid-session', message: 'Session changed. Return home and refresh.' }
    const queueItem = session.queue[session.currentIndex]
    const reference = queueItem && this.byCard.get(queueItem.cardId)
    const progress = queueItem && snapshot.progress.find((item) => item.cardId === queueItem.cardId)
    if (!queueItem || !reference || !progress) return { kind: 'invalid-session', message: 'Card is unavailable.' }
    const verdict = evaluate(reference.strokes, strokes, session.accuracy)
    if (verdict.kind === 'unsubmitted') return { kind: 'unsubmitted', message: 'Write before checking.' }
    if (verdict.kind === 'processing-error') return { kind: 'processing-error', message: 'The attempt could not be checked. Your ink is still here.' }
    const now = this.clock.now()
    const plan = transition(progress, verdict.result.accepted)
    const before = progress.schedulerCard
    const scheduled = plan.rating ? applyRating(before ?? initializeCard(now), plan.rating, now) : null
    const nextProgress: Progress = plan.next.mode === 'review'
      ? { cardId: progress.cardId, mode: 'review', schedulerCard: scheduled?.card ?? before!, createdAt: progress.createdAt, updatedAt: now }
      : { cardId: progress.cardId, mode: 'learning', reason: plan.next.reason, step: plan.next.step, schedulerCard: scheduled?.card ?? before, createdAt: progress.createdAt, updatedAt: now }
    const queue = session.queue.map((item, index) => index === session.currentIndex && plan.complete ? { ...item, completed: true } : item)
    const nextAction = plan.complete ? session.currentIndex === session.queue.length - 1 ? 'session-complete' : 'next-card' : 'learning-step'
    const result = { attemptId: session.attemptId, submittedMode: progress.mode, submittedStep: progress.mode === 'learning' ? progress.step : null, accepted: verdict.result.accepted, diagnostics: verdict.result.diagnostics, nextAction } as const
    const nextSession: Session = { ...session, queue, result }
    const event: AttemptEvent = { attemptId: session.attemptId, sessionId: session.id, cardId: progress.cardId, submittedMode: result.submittedMode, submittedStep: result.submittedStep, accepted: result.accepted, diagnostics: result.diagnostics, accuracy: session.accuracy, submittedAt: now, datasetVersion: this.datasetVersion, matcherVersion: MATCHER_CONFIG_VERSION, schedulerAction: plan.rating, schedulerBefore: before, schedulerAfter: scheduled?.card ?? null, schedulerLog: scheduled?.log ?? null }
    return { kind: 'ready', expectedRevision: snapshot.revision, command: { kind: 'grade', operationId: session.attemptId, session: nextSession, progress: nextProgress, event, activeSessionId: session.id } }
  }

  commitPrepared(prepared: Extract<GradePreparation, { kind: 'ready' }>): Promise<CommitResult> { return this.repo.commit(prepared.command, prepared.expectedRevision) }

  async continue(snapshot: Snapshot): Promise<CommitResult> {
    const session = snapshot.sessions.find((item) => item.id === snapshot.activeSessionId)
    if (!session?.result || session.status !== 'active') throw new Error('No committed result')
    if (session.result.nextAction === 'session-complete') {
      const completed: Session = { ...session, status: 'completed', endedAt: this.clock.now(), result: null }
      return this.repo.commit({ kind: 'continue', operationId: this.ids.next(), session: completed, activeSessionId: null }, snapshot.revision)
    }
    const nextIndex = session.result.nextAction === 'next-card' ? session.currentIndex + 1 : session.currentIndex
    const item = session.queue[nextIndex]
    if (!item) throw new Error('Queue ended unexpectedly')
    const next: Session = { ...session, currentIndex: nextIndex, attemptId: this.ids.next(), result: null }
    const progress = item.category === 'new' && !snapshot.progress.some((record) => record.cardId === item.cardId) ? this.initialProgress(item.cardId, this.clock.now()) : undefined
    return this.repo.commit({ kind: 'continue', operationId: this.ids.next(), session: next, progress, activeSessionId: session.id }, snapshot.revision)
  }

  async end(snapshot: Snapshot): Promise<CommitResult> {
    const session = snapshot.sessions.find((item) => item.id === snapshot.activeSessionId)
    if (!session) throw new Error('No active session')
    return this.repo.commit({ kind: 'end', operationId: this.ids.next(), session: { ...session, status: 'ended', endedAt: this.clock.now() }, activeSessionId: null }, snapshot.revision)
  }

  updateSettings(snapshot: Snapshot, settings: Settings): Promise<CommitResult> { return this.repo.commit({ kind: 'settings', operationId: this.ids.next(), settings }, snapshot.revision) }
  reset(snapshot: Snapshot): Promise<CommitResult> { return this.repo.commit({ kind: 'reset', operationId: this.ids.next() }, snapshot.revision) }

  private initialProgress(cardId: Progress['cardId'], now: number): Progress { return { cardId, mode: 'learning', reason: 'initial', step: 'trace', schedulerCard: null, createdAt: now, updatedAt: now } }
}
