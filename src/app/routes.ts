/** The M0 navigation destinations; unknown hashes resolve to Home. */
export type Route = 'home' | 'session' | 'settings' | 'lab'

export function routeFromHash(hash: string): Route {
  switch (hash) {
    case '#/session':
      return 'session'
    case '#/settings':
      return 'settings'
    case '#/lab':
      return 'lab'
    default:
      return 'home'
  }
}
