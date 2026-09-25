import { useEffect, useRef, useState } from 'react'
import type { KanjiDefinition, Point } from '../domain/handwriting'
import type { Progress, Session, Snapshot } from '../domain/state'
import { StrokeController } from '../drawing/StrokeController'
import type { DojoService, GradePreparation } from '../app/service'
import type { CommitResult } from '../persistence/repository'

const feedback: Record<string, string> = {
  'stroke-count': 'Check the number of strokes.', order: 'Check the stroke order.', direction: 'Check the stroke direction.',
  start: 'Check where the stroke starts.', end: 'Check where the stroke ends.', trajectory: 'Check the stroke shape.',
  length: 'Check the stroke length.', structure: 'Check the overall size and placement.', degenerate: 'A mark was too short to compare.',
}

function paintStroke(ctx: CanvasRenderingContext2D, points: readonly Point[], size: number) {
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0]!.x * size, points[0]!.y * size)
  if (points.length === 1) ctx.lineTo(points[0]!.x * size + 0.01, points[0]!.y * size + 0.01)
  for (const point of points.slice(1)) ctx.lineTo(point.x * size, point.y * size)
  ctx.stroke()
}

type Props = Readonly<{
  session: Session
  progress: Progress
  definition: KanjiDefinition
  snapshot: Snapshot
  service: DojoService
  onCommit(result: CommitResult): void
}>

/** One persisted attempt; keyed by attempt ID so unsubmitted ink never crosses stages. */
export function SessionScreen({ session, progress, definition, snapshot, service, onCommit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<StrokeController | null>(null)
  const frameRef = useRef<number | null>(null)
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState<Extract<GradePreparation, { kind: 'ready' }> | null>(null)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('Write the kanji, then tap Check.')
  const [animationStopped, setAnimationStopped] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const isResult = session.result !== null
  const stage = session.result ? session.result.submittedMode === 'review' ? 'review' : session.result.submittedStep ?? 'trace' : progress.mode === 'review' ? 'review' : progress.step
  const guideVisible = stage === 'trace' || stage === 'copy' || isResult
  const guideOpacity = isResult ? 0.32 : stage === 'trace' ? 0.38 : 0.13

  function paint() {
    frameRef.current = null
    const canvas = canvasRef.current
    const controller = controllerRef.current
    if (!canvas || !controller) return
    const size = canvas.getBoundingClientRect().width
    if (size <= 0) return
    const ratio = window.devicePixelRatio || 1
    const pixels = Math.round(size * ratio)
    if (canvas.width !== pixels || canvas.height !== pixels) { canvas.width = pixels; canvas.height = pixels }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, size, size)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(3, size * 0.012)
    ctx.strokeStyle = '#244739'
    for (const stroke of controller.strokes) paintStroke(ctx, stroke.points, size)
    paintStroke(ctx, controller.activePoints, size)
  }
  function schedulePaint() { if (frameRef.current === null) frameRef.current = requestAnimationFrame(paint) }
  if (!controllerRef.current) controllerRef.current = new StrokeController(schedulePaint, () => setMessage('Incomplete stroke canceled. Try that stroke again.'))
  const controller = controllerRef.current

  useEffect(() => {
    let observedSize = canvasRef.current?.getBoundingClientRect().width ?? 0
    const observer = new ResizeObserver(() => {
      const size = canvasRef.current?.getBoundingClientRect().width ?? 0
      if (size !== observedSize) { observedSize = size; controller.cancel(); schedulePaint() }
    })
    if (canvasRef.current) observer.observe(canvasRef.current)
    const onHidden = () => { if (document.hidden) controller.cancel() }
    const onResize = () => { controller.cancel(); schedulePaint() }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('resize', onResize)
    schedulePaint()
    return () => {
      observer.disconnect(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('resize', onResize)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      controller.cancel()
    }
  }, [])
  function changed() { setRevision((value) => value + 1); schedulePaint() }
  async function submit(prepared: Extract<GradePreparation, { kind: 'ready' }>) {
    setWorking(true)
    const result = await service.commitPrepared(prepared)
    setWorking(false)
    if (result.kind === 'storage-error') { setPending(prepared); setMessage('Progress could not be saved. Retry with the same attempt.'); return }
    setPending(null)
    onCommit(result)
  }
  function check() {
    try {
      const prepared = service.prepareGrade(snapshot, controller.strokes)
      if (prepared.kind !== 'ready') { setMessage(prepared.message); return }
      void submit(prepared)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The attempt could not be checked.') }
  }
  async function next() {
    setWorking(true)
    try { onCommit(await service.continue(snapshot)) } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not continue.') }
    setWorking(false)
  }
  async function end() {
    if (!isResult && controller.strokes.length > 0 && !window.confirm('End session and discard this unsubmitted writing? Saved progress will remain.')) return
    setWorking(true)
    try { onCommit(await service.end(snapshot)) } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not end session.') }
    setWorking(false)
  }
  const cue = definition.readings.filter((reading) => reading.showInPrompt).map((reading) => reading.kana).slice(0, 2).join(' · ')

  return <section className="session-screen" aria-labelledby="session-title">
    <div className="session-top">
      <div>
        <p className="eyebrow">{stage === 'review' ? 'Review' : `Learning · ${stage}`}</p>
        <h1 id="session-title">{definition.promptMeaning}</h1>
        <p className="session-cue">Kana cue: {cue}</p>
        <p className="session-count">Card {session.currentIndex + 1} of {session.queue.length}</p>
      </div>
      <button type="button" className="secondary-action" onClick={() => void end()} disabled={working || !!pending}>End session</button>
    </div>
    <div className="session-workspace">
      <div className="session-writing-column">
        <div className="session-square">
          {guideVisible && <svg key={replayKey} className={`session-guide${stage === 'trace' && !animationStopped && !isResult ? ' animate' : ''}`} viewBox="0 0 109 109" aria-hidden="true" style={{ opacity: guideOpacity }}>
            {definition.strokes.map((stroke) => <path key={stroke.index} d={stroke.pathD} pathLength={1} style={{ animationDelay: `${stroke.index * 0.55}s` }} />)}
          </svg>}
          <canvas
            ref={canvasRef}
            aria-label="Writing surface"
            onPointerDown={(event) => {
              if (isResult || pending || working) return
              if (controller.begin(event.nativeEvent, event.currentTarget.getBoundingClientRect(), session.fingerDrawing)) {
                event.currentTarget.setPointerCapture(event.pointerId)
                setAnimationStopped(true)
                changed()
              }
            }}
            onPointerMove={(event) => {
              if (controller.activePointerId !== event.pointerId) return
              const coalesced = event.nativeEvent.getCoalescedEvents?.()
              controller.move(event.pointerId, coalesced && coalesced.length ? coalesced : [event.nativeEvent])
            }}
            onPointerUp={(event) => { if (controller.end(event.pointerId, event.nativeEvent)) changed() }}
            onPointerCancel={(event) => { controller.cancel(event.pointerId); changed() }}
            onLostPointerCapture={(event) => { controller.cancel(event.pointerId); changed() }}
          />
        </div>
        <div className="writing-actions session-actions">
          <button type="button" onClick={() => { controller.undo(); changed() }} disabled={isResult || !!pending || working || controller.isActive || controller.strokes.length === 0}>Undo</button>
          <button type="button" onClick={() => { controller.clear(); changed() }} disabled={isResult || !!pending || working || controller.isActive || controller.strokes.length === 0}>Clear</button>
          <button className="primary-action" type="button" onClick={check} disabled={isResult || !!pending || working || controller.isActive || controller.strokes.length === 0}>Check</button>
        </div>
        {stage === 'trace' && !isResult && <button type="button" className="secondary-action replay" onClick={() => { setAnimationStopped(false); setReplayKey((key) => key + 1) }} disabled={working || controller.isActive}>Replay stroke guide</button>}
        <div className={`practice-feedback${isResult ? session.result!.accepted ? ' success' : ' error' : ''}`} role="status" aria-live="polite" data-revision={revision}>
          <strong>{isResult ? session.result!.accepted ? 'Match saved' : 'Needs another try · saved' : pending ? 'Save failed' : 'Ready to write'}</strong>
          <p>{isResult ? session.result!.accepted ? 'Good work. Continue when ready.' : 'You can learn it again with the guide.' : message}</p>
          {isResult && !session.result!.accepted && <ul>{session.result!.diagnostics.map((diagnostic, index) => <li key={index}>{diagnostic.strokeIndex === undefined ? '' : `Stroke ${diagnostic.strokeIndex + 1}: `}{feedback[diagnostic.code]}</li>)}</ul>}
          {pending && <button type="button" onClick={() => void submit(pending)} disabled={working}>Retry save</button>}
          {isResult && <button type="button" className="primary-action continue-action" onClick={() => void next()} disabled={working}>{session.result!.submittedMode === 'review' && !session.result!.accepted ? 'Start learning' : session.result!.nextAction === 'session-complete' ? 'Finish session' : 'Continue'}</button>}
        </div>
      </div>
    </div>
  </section>
}
