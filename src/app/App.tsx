import { useEffect, useState } from 'react'
import { routeFromHash, type Route } from './routes'
import { DojoService } from './service'
import { useOffline } from './useOffline'
import { MATCHER_CONFIG_VERSION } from '../matching/matcher'
import { curriculumDataset } from '../data/loader'
import { DEFAULT_QUOTAS, writingCardId, type Quotas } from '../domain/sessionPlanner'
import type { Settings, Snapshot } from '../domain/state'
import { Repository, type CommitResult } from '../persistence/repository'
import { SessionScreen } from '../ui/SessionScreen'
import { TenPractice } from '../ui/TenPractice'
import kanjiNotice from '../../data/sources/kanjivg/NOTICE.md?raw'
import kanjiLicenseUrl from '../../data/sources/kanjivg/COPYING?url'
import '../ui/session.css'

function useRoute(): Route {
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))
  useEffect(() => {
    const update = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

/** Composition root: storage, clock, IDs, and static content are injected here. */
export function App() {
  const route = useRoute()
  const [service, setService] = useState<DojoService | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    let repository: Repository | null = null
    async function initialize() {
      try {
        repository = await Repository.open(import.meta.env.BASE_URL)
        if (!alive) { repository.close(); return }
        const app = new DojoService(repository, curriculumDataset.items, curriculumDataset.datasetVersion, { now: () => Date.now() }, { next: () => crypto.randomUUID() })
        let loaded = await app.load()
        const active = loaded.sessions.find((session) => session.id === loaded.activeSessionId)
        if (active && (active.datasetVersion !== curriculumDataset.datasetVersion || active.matcherVersion !== MATCHER_CONFIG_VERSION)) {
          const ended = await app.end(loaded)
          if (ended.kind === 'storage-error') throw new Error(ended.message)
          loaded = ended.snapshot
          setError('The app content changed. The old session ended safely; saved card progress remains.')
        }
        if (alive) { setService(app); setSnapshot(loaded) }
      } catch (cause) { if (alive) setError(cause instanceof Error ? cause.message : 'Local storage could not be opened.') }
    }
    void initialize()
    return () => { alive = false; repository?.close() }
  }, [])
  useEffect(() => {
    if (!service) return
    const refresh = () => { if (!document.hidden) void service.load().then(setSnapshot).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not reload progress.')) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [service])
  function onCommit(result: CommitResult) {
    if (result.kind === 'storage-error') { setError(`Progress could not be saved: ${result.message}`); return }
    setSnapshot(result.snapshot)
    setError(result.kind === 'conflict' ? 'Another tab changed progress. This page was refreshed; unsubmitted writing was discarded.' : '')
  }
  const active = snapshot?.sessions.find((session) => session.id === snapshot.activeSessionId)
  const offline = useOffline(Boolean(active))
  const current = active?.queue[active.currentIndex]
  const definition = current && curriculumDataset.items.find((item) => writingCardId(item.id) === current.cardId)
  const progress = current && snapshot?.progress.find((item) => item.cardId === current.cardId)
  const lastSession = snapshot && [...snapshot.sessions].sort((a, b) => b.startedAt - a.startedAt)[0]
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#/" aria-label="Kanji Dojo home"><span className="brand-mark" aria-hidden="true">文</span><span>Kanji Dojo</span></a><nav aria-label="Main navigation"><a href="#/" aria-current={route === 'home' ? 'page' : undefined}>Home</a><a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined}>Settings</a></nav></header>
    <main id="main-content">
      {route === 'lab' ? <TenPractice /> : error && !snapshot ? <section className="narrow" role="alert"><h1>Local progress is unavailable</h1><p>{error}</p><p>Existing data has not been reset.</p></section> : !snapshot || !service ? <p role="status">Loading local progress…</p> : route === 'home' ? <Home snapshot={snapshot} service={service} onCommit={onCommit} error={error} /> : route === 'settings' ? <Settings snapshot={snapshot} service={service} onCommit={onCommit} error={error} /> : active && definition && progress ? <SessionScreen key={active.attemptId} session={active} progress={progress} definition={definition} snapshot={snapshot} service={service} onCommit={onCommit} /> : <section className="narrow"><h1>{lastSession?.status === 'completed' ? 'Session complete' : 'No active session'}</h1>{lastSession?.status === 'completed' && <p>{lastSession.queue.filter((item) => item.completed).length} of {lastSession.queue.length} cards completed.</p>}<a className="text-link" href="#/">Return home →</a></section>}
    </main>
    <footer>Writing practice · saved on this device · v0.1{offline.ready && <> · Available offline</>}{offline.error && <> · {offline.error}</>}{offline.updateAvailable && <> · {active ? 'Update available after this session' : <button type="button" className="footer-update" onClick={offline.updateNow}>Update available · reload</button>}</>}{import.meta.env.DEV && <> · <a href="#/lab">Developer lab</a></>}</footer>
  </div>
}

type SharedProps = Readonly<{ snapshot: Snapshot; service: DojoService; onCommit(result: CommitResult): void; error: string }>

function Home({ snapshot, service, onCommit, error }: SharedProps) {
  const [quotas, setQuotas] = useState<Quotas>(DEFAULT_QUOTAS)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const { counts, queue } = service.preview(snapshot, quotas)
  const selectedReview = queue.filter((item) => item.category === 'review').length
  const selectedUnfinished = queue.filter((item) => item.category === 'unfinished').length
  const selectedNew = queue.filter((item) => item.category === 'new').length
  async function start() {
    setWorking(true)
    try {
      const result = await service.start(snapshot, quotas)
      onCommit(result)
      if (result.kind === 'committed') window.location.hash = '#/session'
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not start session.') }
    setWorking(false)
  }
  async function endActive() {
    if (!window.confirm('End this session? Saved progress remains; unsubmitted writing is discarded.')) return
    setWorking(true)
    try { onCommit(await service.end(snapshot)) } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not end session.') }
    setWorking(false)
  }
  return <section className="hero" aria-labelledby="home-title">
    <p className="eyebrow">Kanji Dojo</p><h1 id="home-title">Remember by writing.</h1>
    <p className="lead">Meaning and kana cue the character. Trace it, copy it with a faint guide, then write it from memory.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="alert">{message}</p>}
    {snapshot.activeSessionId ? <div className="panel"><div><h2>Session in progress</h2><p>Resume where you left off. Unsubmitted ink starts blank.</p></div><a className="button" href="#/session">Resume</a><button className="secondary-action" type="button" onClick={() => void endActive()} disabled={working}>End session</button></div> : <div className="home-controls">
      <p><strong>{counts.due}</strong> due reviews · <strong>{counts.unfinished}</strong> unfinished · <strong>{counts.newAvailable}</strong> new available</p>
      <div className="quota-controls">
        <label>Reviews <select value={quotas.reviews} onChange={(event) => setQuotas({ ...quotas, reviews: event.target.value === 'all' ? 'all' : Number(event.target.value) as Quotas['reviews'] })}><option value="0">0</option><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="all">All due</option></select></label>
        <label>New cards <select value={quotas.newCards} onChange={(event) => setQuotas({ ...quotas, newCards: Number(event.target.value) as Quotas['newCards'] })}><option value="0">0</option><option value="5">5</option><option value="10">10</option></select></label>
        <label className="check-option"><input type="checkbox" checked={quotas.includeUnfinished} onChange={(event) => setQuotas({ ...quotas, includeUnfinished: event.target.checked })} /> Include unfinished learning</label>
      </div>
      <p className="queue-preview">{selectedReview} reviews + {selectedUnfinished} unfinished + {selectedNew} new = <strong>{queue.length} cards</strong></p>
      {queue.length === 0 && <p>Choose new cards to begin, or come back when reviews are due.</p>}
      <button className="button button-control" type="button" onClick={() => void start()} disabled={working || queue.length === 0}>Start session</button>
    </div>}
  </section>
}

function Settings({ snapshot, service, onCommit, error }: SharedProps) {
  const [draft, setDraft] = useState<Settings>(snapshot.settings)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  async function save() {
    setWorking(true)
    const result = await service.updateSettings(snapshot, draft)
    onCommit(result)
    if (result.kind === 'committed' || result.kind === 'receipt') setMessage('Settings saved for the next session.')
    setWorking(false)
  }
  async function reset() {
    if (!window.confirm('Delete all local reviews, learning progress, and sessions? Settings will remain.')) return
    setWorking(true)
    const result = await service.reset(snapshot)
    onCommit(result)
    if (result.kind === 'committed' || result.kind === 'receipt') setMessage('Local progress reset.')
    setWorking(false)
  }
  return <section className="narrow settings-screen" aria-labelledby="settings-title">
    <p className="eyebrow">Preferences</p><h1 id="settings-title">Settings</h1>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <label>Writing accuracy: {draft.accuracy}%<input type="range" min="0" max="100" step="1" value={draft.accuracy} onChange={(event) => setDraft({ ...draft, accuracy: Number(event.target.value) })} /></label>
    <p>Higher values require closer shapes. This is a strictness setting, not a skill score.</p>
    <label className="check-option"><input type="checkbox" checked={draft.fingerDrawing} onChange={(event) => setDraft({ ...draft, fingerDrawing: event.target.checked })} /> Draw with finger or touch-reported stylus</label>
    <button className="button button-control" type="button" onClick={() => void save()} disabled={working}>Save settings</button>
    <div className="danger-zone"><h2>Local progress</h2><p>Stored in this browser on this device. Clearing browser data may remove it.</p><button type="button" className="secondary-action" onClick={() => void reset()} disabled={working}>Reset local progress</button></div>
    <details className="source-notice"><summary>About data sources</summary><p>Stroke references are adapted from KanjiVG by Ulrich Apel under CC BY-SA 3.0.</p><pre>{kanjiNotice}</pre><a href={kanjiLicenseUrl}>Read the included license</a></details>
  </section>
}
