import type { CardId, DiagnosticCode } from './handwriting'
import type { StoredCard, StoredLog } from './scheduler'

export type LearningStep = 'trace' | 'copy' | 'recall'
export type LearningReason = 'initial' | 'lapse'
export type Progress =
  | Readonly<{ cardId: CardId; mode: 'learning'; reason: LearningReason; step: LearningStep; schedulerCard: StoredCard | null; createdAt: number; updatedAt: number }>
  | Readonly<{ cardId: CardId; mode: 'review'; schedulerCard: StoredCard; createdAt: number; updatedAt: number }>
export type Settings = Readonly<{ accuracy: number; fingerDrawing: boolean }>
export const DEFAULT_SETTINGS: Settings = { accuracy: 50, fingerDrawing: false }
export type QueueCategory = 'unfinished' | 'review' | 'new'
export type QueueItem = Readonly<{ cardId: CardId; category: QueueCategory; completed: boolean }>
export type CommittedResult = Readonly<{
  attemptId: string
  submittedMode: 'learning' | 'review'
  submittedStep: LearningStep | null
  accepted: boolean
  diagnostics: readonly Readonly<{ code: DiagnosticCode; strokeIndex?: number }>[]
  nextAction: 'learning-step' | 'next-card' | 'session-complete'
}>
export type Session = Readonly<{
  id: string
  status: 'active' | 'completed' | 'ended'
  startedAt: number
  endedAt: number | null
  datasetVersion: string
  matcherVersion: string
  accuracy: number
  fingerDrawing: boolean
  queue: readonly QueueItem[]
  currentIndex: number
  attemptId: string
  result: CommittedResult | null
}>
export type AttemptEvent = Readonly<{
  attemptId: string
  sessionId: string
  cardId: CardId
  submittedMode: 'learning' | 'review'
  submittedStep: LearningStep | null
  accepted: boolean
  diagnostics: CommittedResult['diagnostics']
  accuracy: number
  submittedAt: number
  datasetVersion: string
  matcherVersion: string
  schedulerAction: 'Good' | 'Again' | null
  schedulerBefore: StoredCard | null
  schedulerAfter: StoredCard | null
  schedulerLog: StoredLog | null
}>
export type Snapshot = Readonly<{
  revision: number
  settings: Settings
  progress: readonly Progress[]
  events: readonly AttemptEvent[]
  sessions: readonly Session[]
  activeSessionId: string | null
}>
