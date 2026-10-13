// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('keeps ordinary formatting', () => {
    expect(sanitizeHtml('<h2>Returns</h2><p>Within <strong>14 days</strong>. <a href="https://x.test/a">Read</a></p>'))
      .toBe('<h2>Returns</h2><p>Within <strong>14 days</strong>. <a href="https://x.test/a">Read</a></p>')
  })
  it('removes scripts, frames, inline handlers and script URLs', () => {
    const out = sanitizeHtml('<p onclick="x()">Hi<script>alert(1)</script></p><iframe src="https://x"></iframe><a href="java\tscript:alert(1)">x</a><img src="data:image/svg+xml,..." onerror="x()">')
    expect(out).not.toMatch(/script|iframe|onclick|onerror|data:/i)
    expect(out).toContain('<p>Hi</p>')
  })
  it('adds rel=noopener to new-tab links', () => {
    expect(sanitizeHtml('<a href="https://x.test" target="_blank">x</a>')).toContain('rel="noopener noreferrer"')
  })
})
