import { expect, it } from 'vitest'
import { DojoService } from '../src/app/service'
import { calibrationDataset } from '../src/data/loader'
import type { CapturedStroke } from '../src/domain/handwriting'
import { Repository } from '../src/persistence/repository'

const one = calibrationDataset.items.find((item) => item.character === '一')!
const good: CapturedStroke[] = one.strokes.map((stroke) => ({ pointerType: 'pen', points: stroke.samples.map((point, t) => ({ ...point, t })) }))
const bad: CapturedStroke[] = [{ pointerType: 'pen', points: [...good[0]!.points].reverse() }]
const quotas = { reviews: 0, newCards: 5, includeUnfinished: true } as const

it('commits one grade atomically, reuses its receipt, and rejects stale writes', async () => {
  const repository = await Repository.open(`/unit-${crypto.randomUUID()}/`)
  let now = 1_780_000_000_000
  const service = new DojoService(repository, [one], calibrationDataset.datasetVersion, { now: () => now }, { next: () => crypto.randomUUID() })
  const empty = await service.load()
  const started = await service.start(empty, quotas)
  expect(started.kind).toBe('committed')
  if (started.kind !== 'committed') throw new Error('Start failed')
  const prepared = service.prepareGrade(started.snapshot, good)
  expect(prepared.kind).toBe('ready')
  if (prepared.kind !== 'ready') throw new Error('Preparation failed')
  const committed = await service.commitPrepared(prepared)
  expect(committed.kind).toBe('committed')
  const receipt = await service.commitPrepared(prepared)
  expect(receipt.kind).toBe('receipt')
  const restored = await repository.loadSnapshot()
  expect(restored.events).toHaveLength(1)
  expect(restored.progress[0]).toMatchObject({ mode: 'learning', step: 'copy' })
  const stale = await service.updateSettings(empty, { accuracy: 80, fingerDrawing: true })
  expect(stale.kind).toBe('conflict')
  expect((await service.load()).settings.accuracy).toBe(50)
  now += 1000
  const next = await service.continue(restored)
  expect(next.kind).toBe('committed')
  if (next.kind !== 'committed') throw new Error('Continue failed')
  expect(next.snapshot.sessions[0]?.result).toBeNull()
  expect(next.snapshot.sessions[0]?.attemptId).not.toBe(restored.sessions[0]?.attemptId)
  repository.close()
})

it('gives Good on initial graduation, Again once on failed review, and no extra Good after relearning', async () => {
  const repository = await Repository.open(`/ratings-${crypto.randomUUID()}/`)
  let now = 1_780_000_000_000
  const service = new DojoService(repository, [one], calibrationDataset.datasetVersion, { now: () => now }, { next: () => crypto.randomUUID() })
  let snapshot = await service.load()
  const first = await service.start(snapshot, quotas)
  if (first.kind !== 'committed') throw new Error('Start failed')
  snapshot = first.snapshot
  for (const step of ['trace', 'copy', 'recall']) {
    const prepared = service.prepareGrade(snapshot, good)
    if (prepared.kind !== 'ready') throw new Error(`No ${step} grade`)
    const committed = await service.commitPrepared(prepared)
    if (committed.kind !== 'committed') throw new Error('Grade failed')
    snapshot = committed.snapshot
    const next = await service.continue(snapshot)
    if (next.kind !== 'committed') throw new Error('Continue failed')
    snapshot = next.snapshot
  }
  expect(snapshot.events.filter((event) => event.schedulerAction === 'Good')).toHaveLength(1)
  const due = snapshot.progress[0]!.schedulerCard!.card.due
  now = due
  const reviewStart = await service.start(snapshot, { reviews: 5, newCards: 0, includeUnfinished: true })
  if (reviewStart.kind !== 'committed') throw new Error('Review start failed')
  snapshot = reviewStart.snapshot
  const failed = service.prepareGrade(snapshot, bad)
  if (failed.kind !== 'ready') throw new Error('Review grade missing')
  const lapse = await service.commitPrepared(failed)
  if (lapse.kind !== 'committed') throw new Error('Again failed')
  snapshot = lapse.snapshot
  const dueAfterAgain = snapshot.progress[0]!.schedulerCard!.card.due
  expect(snapshot.progress[0]).toMatchObject({ mode: 'learning', reason: 'lapse', step: 'trace' })
  expect(snapshot.events.filter((event) => event.schedulerAction === 'Again')).toHaveLength(1)
  let next = await service.continue(snapshot)
  if (next.kind !== 'committed') throw new Error('Start learning failed')
  snapshot = next.snapshot
  for (const step of ['trace', 'copy', 'recall']) {
    const prepared = service.prepareGrade(snapshot, good)
    if (prepared.kind !== 'ready') throw new Error(`No lapse ${step} grade`)
    const committed = await service.commitPrepared(prepared)
    if (committed.kind !== 'committed') throw new Error('Relearning grade failed')
    snapshot = committed.snapshot
    next = await service.continue(snapshot)
    if (next.kind !== 'committed') throw new Error('Relearning continue failed')
    snapshot = next.snapshot
  }
  expect(snapshot.events.filter((event) => event.schedulerAction === 'Good')).toHaveLength(1)
  expect(snapshot.progress[0]!.schedulerCard!.card.due).toBe(dueAfterAgain)
  repository.close()
})

it('reset clears history and active session while retaining preferences', async () => {
  const repository = await Repository.open(`/reset-${crypto.randomUUID()}/`)
  const service = new DojoService(repository, [one], calibrationDataset.datasetVersion, { now: () => 1_780_000_000_000 }, { next: () => crypto.randomUUID() })
  const empty = await service.load()
  const settings = await service.updateSettings(empty, { accuracy: 75, fingerDrawing: true })
  if (settings.kind !== 'committed') throw new Error('Settings failed')
  const started = await service.start(settings.snapshot, quotas)
  if (started.kind !== 'committed') throw new Error('Start failed')
  const reset = await service.reset(started.snapshot)
  if (reset.kind !== 'committed') throw new Error('Reset failed')
  expect(reset.snapshot).toMatchObject({ activeSessionId: null, settings: { accuracy: 75, fingerDrawing: true }, progress: [], events: [], sessions: [] })
  repository.close()
})

it('aborts every store write when validation fails partway through a grade', async () => {
  const repository = await Repository.open(`/abort-${crypto.randomUUID()}/`)
  const service = new DojoService(repository, [one], calibrationDataset.datasetVersion, { now: () => 1_780_000_000_000 }, { next: () => crypto.randomUUID() })
  const started = await service.start(await service.load(), quotas)
  if (started.kind !== 'committed') throw new Error('Start failed')
  const prepared = service.prepareGrade(started.snapshot, good)
  if (prepared.kind !== 'ready') throw new Error('Preparation failed')
  const invalid = { ...prepared.command, progress: { ...prepared.command.progress, updatedAt: prepared.command.progress.createdAt - 1 } }
  const failed = await repository.commit(invalid, started.snapshot.revision)
  expect(failed.kind).toBe('storage-error')
  const restored = await repository.loadSnapshot()
  expect(restored.revision).toBe(started.snapshot.revision)
  expect(restored.events).toHaveLength(0)
  expect(restored.sessions[0]?.result).toBeNull()
  repository.close()
})

it('rejects a stale grade prepared in a second tab without duplicating a rating', async () => {
  const path = `/two-tabs-${crypto.randomUUID()}/`
  const firstRepository = await Repository.open(path)
  const secondRepository = await Repository.open(path)
  const clock = { now: () => 1_780_000_000_000 }
  const ids = { next: () => crypto.randomUUID() }
  const firstService = new DojoService(firstRepository, [one], calibrationDataset.datasetVersion, clock, ids)
  const secondService = new DojoService(secondRepository, [one], calibrationDataset.datasetVersion, clock, ids)
  const start = await firstService.start(await firstService.load(), quotas)
  if (start.kind !== 'committed') throw new Error('Start failed')
  const first = firstService.prepareGrade(start.snapshot, good)
  const second = secondService.prepareGrade(await secondService.load(), bad)
  if (first.kind !== 'ready' || second.kind !== 'ready') throw new Error('Grade was not prepared')
  expect((await firstService.commitPrepared(first)).kind).toBe('committed')
  expect((await secondService.commitPrepared(second)).kind).toBe('conflict')
  expect((await secondService.load()).events).toHaveLength(1)
  firstRepository.close()
  secondRepository.close()
})
