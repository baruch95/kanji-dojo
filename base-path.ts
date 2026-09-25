/** Validates the same-origin directory path used for Vite assets and Pages hosting. */
export function validateBasePath(value: string | undefined): string {
  const path = value ?? '/'
  if (
    !path.startsWith('/') ||
    !path.endsWith('/') ||
    path.startsWith('//') ||
    path.includes('//') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    [...path].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
    path.split('/').some((segment) => segment === '.' || segment === '..' || /%[0-9a-f]{2}/i.test(segment))
  ) {
    throw new Error(`VITE_BASE_PATH must be a plain same-origin directory path: ${path}`)
  }
  return path
}
