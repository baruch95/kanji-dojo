import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb'
import type { AttemptEvent, Progress, Session, Settings, Snapshot } from '../domain/state'
import { DEFAULT_SETTINGS } from '../domain/state'
import { parseStoredCard, parseStoredLog } from '../scheduling/fsrsAdapter'

export const STORAGE_SCHEMA_VERSION = 1
type Metadata = Readonly<{ key: 'app'; schemaVersion: 1; revision: number; activeSessionId: string | null }>
type SettingsRecord = Settings & Readonly<{ key: 'preferences'; schemaVersion: 1 }>
type Receipt = Readonly<{ operationId: string; payload: string }>
interface DojoSchema extends DBSchema {
  metadata: { key: string; value: Metadata }
  settings: { key: string; value: SettingsRecord }
  progress: { key: string; value: Progress }
  sessions: { key: string; value: Session }
  attemptEvents: { key: string; value: AttemptEvent }
  receipts: { key: string; value: Receipt }
}
const stores = ['metadata', 'settings', 'progress', 'sessions', 'attemptEvents', 'receipts'] as const
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const cardId = (value: unknown): value is Progress['cardId'] => typeof value === 'string' && /^writing:u[0-9a-f]{4,6}:v1$/.test(value)
const fail = (detail: string): never => { throw new Error(`Stored data is invalid: ${detail}`) }

function parseSettings(value: unknown): Settings {
  if (!record(value) || value.key !== 'preferences' || value.schemaVersion !== 1 || !integer(value.accuracy) || value.accuracy < 0 || value.accuracy > 100 || typeof value.fingerDrawing !== 'boolean') return fail('settings')
  return { accuracy: value.accuracy, fingerDrawing: value.fingerDrawing }
}
function parseProgress(value: unknown): Progress {
  if (!record(value) || !cardId(value.cardId) || !integer(value.createdAt) || !integer(value.updatedAt) || value.updatedAt < value.createdAt) return fail('progress')
  if (value.mode === 'review') {
    if (value.schedulerCard === null) return fail('review card')
    return { cardId: value.cardId, mode: 'review', schedulerCard: parseStoredCard(value.schedulerCard), createdAt: value.createdAt, updatedAt: value.updatedAt }
  }
  if (value.mode === 'learning' && (value.reason === 'initial' || value.reason === 'lapse') && (value.step === 'trace' || value.step === 'copy' || value.step === 'recall')) {
    if ((value.reason === 'initial' && value.schedulerCard !== null) || (value.reason === 'lapse' && value.schedulerCard === null)) return fail('learning card')
    return { cardId: value.cardId, mode: 'learning', reason: value.reason, step: value.step, schedulerCard: value.schedulerCard === null ? null : parseStoredCard(value.schedulerCard), createdAt: value.createdAt, updatedAt: value.updatedAt }
  }
  return fail('mode')
}
function parseDiagnostic(value: unknown) {
  const codes = ['stroke-count', 'order', 'direction', 'start', 'end', 'trajectory', 'length', 'structure', 'degenerate'] as const
  if (!record(value) || !codes.includes(value.code as typeof codes[number]) || (value.strokeIndex !== undefined && (!integer(value.strokeIndex) || value.strokeIndex < 0))) return fail('diagnostic')
  return { code: value.code as typeof codes[number], ...(value.strokeIndex === undefined ? {} : { strokeIndex: value.strokeIndex as number }) }
}
function parseSession(value: unknown): Session {
  if (!record(value) || !uuid(value.id) || !['active', 'completed', 'ended'].includes(String(value.status)) || !integer(value.startedAt) || (value.endedAt !== null && !integer(value.endedAt)) || typeof value.datasetVersion !== 'string' || typeof value.matcherVersion !== 'string' || !integer(value.accuracy) || value.accuracy < 0 || value.accuracy > 100 || typeof value.fingerDrawing !== 'boolean' || !Array.isArray(value.queue) || !integer(value.currentIndex) || value.currentIndex < 0 || value.currentIndex > value.queue.length || !uuid(value.attemptId)) return fail('session')
  const queue = value.queue.map((entry: unknown) => {
    if (!record(entry) || !cardId(entry.cardId) || !['unfinished', 'review', 'new'].includes(String(entry.category)) || typeof entry.completed !== 'boolean') return fail('queue')
    return { cardId: entry.cardId, category: entry.category as 'unfinished' | 'review' | 'new', completed: entry.completed }
  })
  if (queue.length === 0 || value.currentIndex >= queue.length || new Set(queue.map((entry) => entry.cardId)).size !== queue.length || queue.slice(0, value.currentIndex).some((entry) => !entry.completed)) return fail('queue position')
  if ((value.status === 'active' && value.endedAt !== null) || (value.status !== 'active' && (value.endedAt === null || value.endedAt < value.startedAt))) return fail('session status')
  let result: Session['result'] = null
  if (value.result !== null) {
    if (!record(value.result) || !uuid(value.result.attemptId) || !['learning', 'review'].includes(String(value.result.submittedMode)) || (value.result.submittedStep !== null && !['trace', 'copy', 'recall'].includes(String(value.result.submittedStep))) || typeof value.result.accepted !== 'boolean' || !Array.isArray(value.result.diagnostics) || !['learning-step', 'next-card', 'session-complete'].includes(String(value.result.nextAction))) return fail('result')
    result = { attemptId: value.result.attemptId, submittedMode: value.result.submittedMode as 'learning' | 'review', submittedStep: value.result.submittedStep as 'trace' | 'copy' | 'recall' | null, accepted: value.result.accepted, diagnostics: value.result.diagnostics.map(parseDiagnostic), nextAction: value.result.nextAction as 'learning-step' | 'next-card' | 'session-complete' }
  }
  if (result && (value.status !== 'active' || result.attemptId !== value.attemptId || (result.submittedMode === 'review') !== (result.submittedStep === null))) return fail('result state')
  return { id: value.id, status: value.status as Session['status'], startedAt: value.startedAt, endedAt: value.endedAt, datasetVersion: value.datasetVersion, matcherVersion: value.matcherVersion, accuracy: value.accuracy, fingerDrawing: value.fingerDrawing, queue, currentIndex: value.currentIndex, attemptId: value.attemptId, result }
}
function parseEvent(value: unknown): AttemptEvent {
  if (!record(value) || !uuid(value.attemptId) || !uuid(value.sessionId) || !cardId(value.cardId) || !['learning', 'review'].includes(String(value.submittedMode)) || (value.submittedStep !== null && !['trace', 'copy', 'recall'].includes(String(value.submittedStep))) || typeof value.accepted !== 'boolean' || !Array.isArray(value.diagnostics) || !integer(value.accuracy) || !integer(value.submittedAt) || typeof value.datasetVersion !== 'string' || typeof value.matcherVersion !== 'string' || ![null, 'Good', 'Again'].includes(value.schedulerAction as null | string) || (value.schedulerLog !== null && !record(value.schedulerLog))) return fail('event')
  const schedulerLog = value.schedulerLog === null ? null : parseStoredLog(value.schedulerLog)
  return { attemptId: value.attemptId, sessionId: value.sessionId, cardId: value.cardId, submittedMode: value.submittedMode as 'learning' | 'review', submittedStep: value.submittedStep as 'trace' | 'copy' | 'recall' | null, accepted: value.accepted, diagnostics: value.diagnostics.map(parseDiagnostic), accuracy: value.accuracy, submittedAt: value.submittedAt, datasetVersion: value.datasetVersion, matcherVersion: value.matcherVersion, schedulerAction: value.schedulerAction as 'Good' | 'Again' | null, schedulerBefore: value.schedulerBefore === null ? null : parseStoredCard(value.schedulerBefore), schedulerAfter: value.schedulerAfter === null ? null : parseStoredCard(value.schedulerAfter), schedulerLog }
}

export type Mutation =
  | Readonly<{ kind: 'start' | 'present' | 'continue' | 'end'; operationId: string; session: Session; progress?: Progress; activeSessionId: string | null }>
  | Readonly<{ kind: 'grade'; operationId: string; session: Session; progress: Progress; event: AttemptEvent; activeSessionId: string | null }>
  | Readonly<{ kind: 'settings'; operationId: string; settings: Settings }>
  | Readonly<{ kind: 'reset'; operationId: string }>
export type CommitResult = Readonly<{ kind: 'committed' | 'receipt' | 'conflict'; snapshot: Snapshot }> | Readonly<{ kind: 'storage-error'; message: string }>

/** Transactional IndexedDB repository, scoped by hosting base path. */
export class Repository {
  private constructor(private readonly db: IDBPDatabase<DojoSchema>) {}

  static async open(basePath: string): Promise<Repository> {
    const scope = encodeURIComponent(basePath.replace(/\/+$/, '') || '/')
    let rejectedByBlock = false
    let rejectBlocked: (error: Error) => void = () => undefined
    const blocked = new Promise<never>((_, reject: (error: Error) => void) => { rejectBlocked = reject })
    const opening = openDB<DojoSchema>(`kanji-dojo:${scope}`, STORAGE_SCHEMA_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion === 0) {
          database.createObjectStore('metadata', { keyPath: 'key' })
          database.createObjectStore('settings', { keyPath: 'key' })
          database.createObjectStore('progress', { keyPath: 'cardId' })
          database.createObjectStore('sessions', { keyPath: 'id' })
          database.createObjectStore('attemptEvents', { keyPath: 'attemptId' })
          database.createObjectStore('receipts', { keyPath: 'operationId' })
        }
      },
      blocked() { rejectedByBlock = true; rejectBlocked(new Error('A different tab is blocking a storage update. Close other Kanji Dojo tabs, then reload.')) },
      blocking() { opening.then((database) => database.close()).catch(() => undefined) },
    })
    void opening.then((database) => { if (rejectedByBlock) database.close() }).catch(() => undefined)
    const db = await Promise.race([opening, blocked])
    return new Repository(db)
  }

  close(): void { this.db.close() }

  async loadSnapshot(): Promise<Snapshot> {
    const tx = this.db.transaction(stores, 'readonly')
    const [rawMeta, rawSettings, rawProgress, rawSessions, rawEvents] = await Promise.all([
      tx.objectStore('metadata').get('app'), tx.objectStore('settings').get('preferences'),
      tx.objectStore('progress').getAll(), tx.objectStore('sessions').getAll(), tx.objectStore('attemptEvents').getAll(),
    ])
    await tx.done
    const metadata = rawMeta ?? { key: 'app', schemaVersion: 1, revision: 0, activeSessionId: null }
    if (!record(metadata) || metadata.schemaVersion !== 1 || !integer(metadata.revision) || metadata.revision < 0 || (metadata.activeSessionId !== null && !uuid(metadata.activeSessionId))) return fail('metadata')
    const settings = rawSettings === undefined ? DEFAULT_SETTINGS : parseSettings(rawSettings)
    const progress = rawProgress.map(parseProgress)
    const sessions = rawSessions.map(parseSession)
    const events = rawEvents.map(parseEvent)
    if (new Set(progress.map((item) => item.cardId)).size !== progress.length || new Set(sessions.map((item) => item.id)).size !== sessions.length || new Set(events.map((item) => item.attemptId)).size !== events.length || (metadata.activeSessionId !== null && !sessions.some((session) => session.id === metadata.activeSessionId && session.status === 'active'))) return fail('joins')
    return { revision: metadata.revision, activeSessionId: metadata.activeSessionId, settings, progress, sessions, events }
  }

  async commit(command: Mutation, expectedRevision: number): Promise<CommitResult> {
    let tx: IDBPTransaction<DojoSchema, typeof stores, 'readwrite'> | null = null
    try {
      if (!uuid(command.operationId) || !integer(expectedRevision) || expectedRevision < 0) throw new Error('Invalid command')
      tx = this.db.transaction(stores, 'readwrite')
      const receipts = tx.objectStore('receipts')
      const payload = JSON.stringify(command)
      const existing = await receipts.get(command.operationId)
      if (existing) {
        if (existing.payload !== payload) { tx.abort(); await tx.done.catch(() => undefined); return { kind: 'conflict', snapshot: await this.loadSnapshot() } }
        await tx.done
        return { kind: 'receipt', snapshot: await this.loadSnapshot() }
      }
      if (command.kind === 'grade') {
        const prior = await tx.objectStore('attemptEvents').get(command.event.attemptId)
        if (prior) {
          tx.abort()
          await tx.done.catch(() => undefined)
          return { kind: 'conflict', snapshot: await this.loadSnapshot() }
        }
      }
      const current = await tx.objectStore('metadata').get('app')
      const revision = current?.revision ?? 0
      if (revision !== expectedRevision) { tx.abort(); await tx.done.catch(() => undefined); return { kind: 'conflict', snapshot: await this.loadSnapshot() } }
      if (command.kind === 'reset') {
        await Promise.all([tx.objectStore('progress').clear(), tx.objectStore('sessions').clear(), tx.objectStore('attemptEvents').clear(), receipts.clear()])
      } else if (command.kind === 'settings') {
        parseSettings({ ...command.settings, key: 'preferences', schemaVersion: 1 })
        await tx.objectStore('settings').put({ ...command.settings, key: 'preferences', schemaVersion: 1 })
      } else {
        parseSession(command.session)
        await tx.objectStore('sessions').put(command.session)
        if (command.progress) { parseProgress(command.progress); await tx.objectStore('progress').put(command.progress) }
        if (command.kind === 'grade') { parseEvent(command.event); await tx.objectStore('attemptEvents').put(command.event) }
      }
      const activeSessionId = command.kind === 'settings' ? current?.activeSessionId ?? null : command.kind === 'reset' ? null : command.activeSessionId
      await tx.objectStore('metadata').put({ key: 'app', schemaVersion: 1, revision: revision + 1, activeSessionId })
      await receipts.put({ operationId: command.operationId, payload })
      await tx.done
      return { kind: 'committed', snapshot: await this.loadSnapshot() }
    } catch (error) {
      try { tx?.abort() } catch { /* Transaction may already be complete. */ }
      await tx?.done.catch(() => undefined)
      return { kind: 'storage-error', message: error instanceof Error ? error.message : 'Storage failed' }
    }
  }
}
