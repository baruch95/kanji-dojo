import { useEffect, useState } from 'react'
import { routeFromHash, type Route } from './routes'
import { TenPractice } from '../ui/TenPractice'
import kanjiNotice from '../../data/sources/kanjivg/NOTICE.md?raw'
import kanjiLicenseUrl from '../../data/sources/kanjivg/COPYING?url'

function useRoute(): Route {
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))
  useEffect(() => {
    const update = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

/** Composition root for the M0 navigation shell. */
export function App() {
  const route = useRoute()
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#/" aria-label="Kanji Dojo home">
          <span className="brand-mark" aria-hidden="true">文</span>
          <span>Kanji Dojo</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#/" aria-current={route === 'home' ? 'page' : undefined}>Home</a>
          <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined}>Settings</a>
        </nav>
      </header>
      <main id="main-content">
        {route === 'home' && <Home />}
        {route === 'session' && <TenPractice />}
        {route === 'settings' && <Settings />}
      </main>
      <footer>One-kanji practice prototype · progress is not saved · v0.1</footer>
    </div>
  )
}

function Home() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <p className="eyebrow">A quieter way to practice</p>
      <h1 id="home-title">Remember by writing.</h1>
      <p className="lead">Practice writing one kanji with a visible reference. This early input prototype checks strokes locally and does not save progress.</p>
      <div className="panel">
        <span className="panel-icon" aria-hidden="true">✎</span>
        <div>
          <h2>Try the 十 practice lab</h2>
          <p>Write with a pen or mouse, check, undo, and try again.</p>
        </div>
        <a className="button" href="#/session">Start practice</a>
      </div>
    </section>
  )
}

function Settings() {
  return (
    <section className="narrow" aria-labelledby="settings-title">
      <p className="eyebrow">Settings</p>
      <h1 id="settings-title">Settings are coming.</h1>
      <p>Session accuracy and local progress controls will appear with learning and storage. The practice lab has a temporary finger drawing option.</p>
      <details className="source-notice">
        <summary>About data sources</summary>
        <p>The 十 stroke reference is adapted from KanjiVG by Ulrich Apel under CC BY-SA 3.0.</p>
        <pre>{kanjiNotice}</pre>
        <a href={kanjiLicenseUrl}>Read the included license</a>
      </details>
      <a className="text-link" href="#/">Return home →</a>
    </section>
  )
}
