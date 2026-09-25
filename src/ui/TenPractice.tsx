import { useEffect, useRef, useState } from 'react'
import { tenDefinition } from '../data/generated/ten'
import { calibrationDataset } from '../data/loader'
import { StrokeController } from '../drawing/StrokeController'
import { evaluate, MATCHER_CONFIG_VERSION } from '../matching/matcher'
import type { MatchResult, Point } from '../domain/handwriting'

const messages: Record<string, string> = {
  'stroke-count': 'The number of strokes differs from the reference.',
  order: 'Check the stroke order.',
  direction: 'Check the stroke direction.',
  start: 'Start position differs from the reference.',
  end: 'End position differs from the reference.',
  trajectory: 'The stroke shape differs from the reference.',
  length: 'The stroke length differs from the reference.',
  structure: 'The overall size or placement differs from the reference.',
  degenerate: 'A mark was too short to compare.',
}

function paintStroke(ctx: CanvasRenderingContext2D, points: readonly Point[], size: number) {
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0]!.x * size, points[0]!.y * size)
  if (points.length === 1) ctx.lineTo(points[0]!.x * size + 0.01, points[0]!.y * size + 0.01)
  for (const point of points.slice(1)) ctx.lineTo(point.x * size, point.y * size)
  ctx.stroke()
}

/** Visible-reference M1 practice lab; it is not a concealed review or saved session. */
export function TenPractice() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<StrokeController | null>(null)
  const frameRef = useRef<number | null>(null)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('Write the strokes, then tap Check.')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [fingerEnabled, setFingerEnabled] = useState(false)
  const [fixtureLabel, setFixtureLabel] = useState('correct')
  const [fixtureRationale, setFixtureRationale] = useState('')
  const [fixtureDevice, setFixtureDevice] = useState('')
  const [fixturePermission, setFixturePermission] = useState(false)
  const [targetId, setTargetId] = useState('u5341')
  const selected = import.meta.env.DEV ? calibrationDataset.items.find((item) => item.id === targetId) ?? tenDefinition : tenDefinition

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

  function schedulePaint() {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(paint)
  }

  if (!controllerRef.current) {
    controllerRef.current = new StrokeController(schedulePaint, () => setMessage('Incomplete stroke canceled. Try that stroke again.'))
  }
  const controller = controllerRef.current

  useEffect(() => {
    const observer = new ResizeObserver(() => { controller.cancel(); schedulePaint() })
    const canvas = canvasRef.current
    if (canvas) observer.observe(canvas)
    const onHidden = () => { if (document.hidden) { controller.cancel(); setRevision((value) => value + 1) } }
    const onResize = () => { controller.cancel(); setRevision((value) => value + 1); schedulePaint() }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('resize', onResize)
    schedulePaint()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('resize', onResize)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      controller.cancel()
    }
  }, [])

  function changed() { setResult(null); setRevision((value) => value + 1); schedulePaint() }

  function exportFixture() {
    if (!fixturePermission || !fixtureRationale.trim() || !fixtureDevice.trim()) return
    const fixture = {
      schemaVersion: 1,
      targetId: selected.id,
      datasetVersion: import.meta.env.DEV ? calibrationDataset.datasetVersion : tenDefinition.datasetVersion,
      matcherVersion: MATCHER_CONFIG_VERSION,
      strokes: controller.strokes,
      deviceInputDescription: fixtureDevice.trim(),
      humanLabel: fixtureLabel,
      rationale: fixtureRationale.trim(),
      permissionToIncludeInRepository: true,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(fixture, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${selected.id}-fixture-${crypto.randomUUID()}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section className="practice" aria-labelledby="practice-title">
      <div className="practice-heading">
        <div>
          <p className="eyebrow">M1 · One-kanji practice lab</p>
          <h1 id="practice-title">Write {selected.character}</h1>
          <p className="practice-intro">A visible reference for testing handwriting input and stroke order. This attempt is not saved or scheduled.</p>
        </div>
        <a className="text-link" href="#/">← Home</a>
      </div>
      <div className="practice-grid">
        <aside className="reference-card" aria-label={`Visible reference for ${selected.promptMeaning}`}>
          <span className="small-label">Reference · {selected.promptMeaning} · {selected.readings[0]?.kana}</span>
          <svg viewBox="0 0 109 109" role="img" aria-label={`${selected.strokeCount} ordered strokes of ${selected.promptMeaning}`}>
            {selected.strokes.map((stroke) => <path key={stroke.index} d={stroke.pathD} fill="none" stroke="#244739" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />)}
          </svg>
          {selected.character === '十' && <ol><li>Across, left to right</li><li>Down, top to bottom</li></ol>}
        </aside>
        <div className="writing-column">
          <div className="writing-square">
            <canvas
              ref={canvasRef}
              aria-label={`Writing surface for ${selected.promptMeaning}`}
              onPointerDown={(event) => {
                if (controller.begin(event.nativeEvent, event.currentTarget.getBoundingClientRect(), fingerEnabled)) {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setMessage('Keep writing, then tap Check.')
                  changed()
                }
              }}
              onPointerMove={(event) => {
                if (controller.activePointerId !== event.pointerId) return
                const coalesced = event.nativeEvent.getCoalescedEvents?.()
                const samples = coalesced && coalesced.length > 0 ? coalesced : [event.nativeEvent]
                controller.move(event.pointerId, samples)
                if (!controller.isActive) setRevision((value) => value + 1)
              }}
              onPointerUp={(event) => { if (controller.end(event.pointerId, event.nativeEvent)) changed() }}
              onPointerCancel={(event) => { controller.cancel(event.pointerId); setRevision((value) => value + 1) }}
              onLostPointerCapture={(event) => { controller.cancel(event.pointerId); setRevision((value) => value + 1) }}
            />
          </div>
          <div className="writing-actions">
            <button type="button" onClick={() => { controller.undo(); changed() }} disabled={controller.isActive || controller.strokes.length === 0}>Undo</button>
            <button type="button" onClick={() => { controller.clear(); changed() }} disabled={controller.isActive || controller.strokes.length === 0}>Clear</button>
            <button className="primary-action" type="button" onClick={() => { const outcome = evaluate(selected.strokes, controller.strokes, 50); if (outcome.kind === 'match') { setResult(outcome.result); setMessage(outcome.result.accepted ? 'The strokes match this reference.' : 'Try again or adjust your strokes.') } else { setResult(null); setMessage(outcome.kind === 'processing-error' ? 'The attempt could not be checked. Your ink is still here.' : 'Write a stroke, then tap Check.') } }} disabled={controller.isActive || controller.strokes.length === 0}>Check</button>
          </div>
          <label className="finger-option"><input type="checkbox" checked={fingerEnabled} onChange={(event) => setFingerEnabled(event.target.checked)} /> Draw with finger</label>
          <div className={`practice-feedback${result ? result.accepted ? ' success' : ' error' : ''}`} role="status" aria-live="polite" data-revision={revision}>
            <strong>{result ? result.accepted ? 'Match' : 'Needs another try' : 'Ready to write'}</strong>
            <p>{message}</p>
            {result && !result.accepted && <ul>{result.diagnostics.map((diagnostic, index) => <li key={index}>{diagnostic.strokeIndex === undefined ? '' : `Stroke ${diagnostic.strokeIndex + 1}: `}{messages[diagnostic.code]}</li>)}</ul>}
          </div>
        </div>
      </div>
      {import.meta.env.DEV && <details className="fixture-tool">
        <summary>Developer fixture export</summary>
        <p>Exports strokes locally as JSON. Label them independently before including them in tests.</p>
        <label>Calibration character <select value={targetId} onChange={(event) => { controller.clear(); setResult(null); setTargetId(event.target.value); setRevision((value) => value + 1); schedulePaint() }}>{calibrationDataset.items.map((item) => <option key={item.id} value={item.id}>{item.character} · {item.promptMeaning}</option>)}</select></label>
        <label>Human label <select value={fixtureLabel} onChange={(event) => setFixtureLabel(event.target.value)}><option value="correct">Correct</option><option value="incorrect">Incorrect</option></select></label>
        <label>Device and input description <input value={fixtureDevice} onChange={(event) => setFixtureDevice(event.target.value)} placeholder="e.g. iPad model, OS, Pencil" /></label>
        <label>Reason for label <textarea value={fixtureRationale} onChange={(event) => setFixtureRationale(event.target.value)} /></label>
        <label><input type="checkbox" checked={fixturePermission} onChange={(event) => setFixturePermission(event.target.checked)} /> I permit this fixture to be included in this repository.</label>
        <button type="button" onClick={exportFixture} disabled={controller.strokes.length === 0 || !fixturePermission || !fixtureRationale.trim() || !fixtureDevice.trim()}>Export JSON</button>
      </details>}
      {import.meta.env.DEV && <details className="fixture-tool">
        <summary>Calibration source gallery</summary>
        <div className="calibration-gallery">
          {calibrationDataset.items.map((item) => <figure key={item.id}>
            <svg viewBox="0 0 109 109" role="img" aria-label={`${item.character}: ${item.strokeCount} stroke reference`}>
              {item.strokes.map((stroke) => <path key={stroke.index} d={stroke.pathD} pathLength={1} className="gallery-stroke" style={{ animationDelay: `${stroke.index * 0.7}s` }} />)}
            </svg>
            <figcaption><strong>{item.character}</strong> · {item.promptMeaning} · {item.readings[0]?.kana} · {item.strokeCount} strokes</figcaption>
          </figure>)}
        </div>
      </details>}
    </section>
  )
}
