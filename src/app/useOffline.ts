import { useEffect, useRef, useState } from 'react'

export type OfflineState = Readonly<{ ready: boolean; updateAvailable: boolean; error: string | null; updateNow(): void }>

/** Registers only in production and reports readiness after active control and precache verification. */
export function useOffline(activeSession: boolean): OfflineState {
  const [ready, setReady] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadOnControlRef = useRef(false)
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !('caches' in window)) return
    let alive = true
    const scope = import.meta.env.BASE_URL
    async function verifyReady() {
      if (!navigator.serviceWorker.controller) return
      const names = await caches.keys()
      const indexUrl = new URL(`${scope}index.html`, window.location.origin).href
      const manifestUrl = new URL(`${scope}manifest.webmanifest`, window.location.origin).href
      for (const name of names.filter((value) => value.includes('kanji-dojo'))) {
        const cache = await caches.open(name)
        if (await cache.match(indexUrl, { ignoreSearch: true }) && await cache.match(manifestUrl, { ignoreSearch: true })) {
          if (alive) setReady(true)
          return
        }
      }
    }
    const onControllerChange = () => {
      if (reloadOnControlRef.current) window.location.reload()
      else void verifyReady()
    }
    const onFocus = () => { void registrationRef.current?.update() }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    window.addEventListener('focus', onFocus)
    async function register() {
      try {
        const registration = await navigator.serviceWorker.register(`${scope}sw.js`, { scope })
        if (!alive) return
        registrationRef.current = registration
        const inspect = () => {
          if (registration.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true)
          void verifyReady()
        }
        registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', inspect))
        inspect()
        await navigator.serviceWorker.ready
        await verifyReady()
      } catch { if (alive) setError('Offline setup did not finish. Reopen online to retry.') }
    }
    void register()
    return () => { alive = false; navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); window.removeEventListener('focus', onFocus) }
  }, [])
  return { ready, updateAvailable, error, updateNow() {
    if (activeSession || !registrationRef.current?.waiting) return
    reloadOnControlRef.current = true
    registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' })
  } }
}
