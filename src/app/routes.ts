/** The M0 navigation destinations; unknown hashes resolve to Home. */
export type Route = 'home' | 'session' | 'settings'

export function routeFromHash(hash: string): Route {
  switch (hash) {
    case '#/session':
      return 'session'
    case '#/settings':
      return 'settings'
    default:
      return 'home'
  }
}
