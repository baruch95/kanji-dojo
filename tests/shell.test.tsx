import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../src/app/App'
import { validateBasePath } from '../base-path'

afterEach(() => {
  window.location.hash = ''
})

describe('M0 shell navigation', () => {
  it('loads local progress and returns home for an unknown route', async () => {
    window.location.hash = '#/'
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Start session' })).toBeDisabled()
    expect(screen.getByText(/new available/i)).toBeInTheDocument()
    window.location.hash = '#/unexpected'
    fireEvent(window, new Event('hashchange'))
    expect(screen.getByRole('heading', { name: 'Remember by writing.' })).toBeInTheDocument()
  })
})

describe('hosting base path', () => {
  it('accepts root and repository directories, rejecting URL and traversal forms', () => {
    expect(validateBasePath(undefined)).toBe('/')
    expect(validateBasePath('/kanji-dojo/')).toBe('/kanji-dojo/')
    for (const value of ['https://example.com/', '//example/', '/a/../', '/a/%2e%2e/', '/a?b/', '/a#b/', '/a\\b/']) {
      expect(() => validateBasePath(value)).toThrow()
    }
  })
})
