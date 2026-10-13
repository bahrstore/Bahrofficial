// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../store'
import { Footer } from './Footer'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let host: HTMLElement | undefined

function render(lang: 'en' | 'ar') {
  localStorage.setItem('bahr.store.v1', JSON.stringify({ lang }))
  host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  act(() => root!.render(<MemoryRouter><StoreProvider><Footer /></StoreProvider></MemoryRouter>))
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  localStorage.clear()
})

const HREFS = ['/pages/delivery', '/pages/returns', '/pages/contact', '/pages/faq', '/pages/about', '/pages/privacy', '/pages/terms']
const year = new Date().getFullYear()

describe('Footer', () => {
  it('renders in English, left to right', () => {
    const el = render('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect([...el.querySelectorAll('nav')].map(n => n.getAttribute('aria-label'))).toEqual(['Help', 'Company'])
    expect([...el.querySelectorAll('nav a')].map(a => a.getAttribute('href'))).toEqual(HREFS)
    expect(el.querySelector('nav a')!.textContent).toBe('Delivery↗')
    expect(el.querySelector('.sf-mark')!.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelector('.sf-mark')!.textContent).toBe('Bahr')
    expect(el.querySelector('.sf-chip')!.textContent).toBe('Cash on delivery')
    expect(el.querySelector('.sf-rights')!.textContent).toBe(`© ${year} Bahr. All rights reserved.`)
    expect(el.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Language')
    expect(el.querySelector('button[lang="en"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('button[lang="ar"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('renders in Arabic, right to left', () => {
    const el = render('ar')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect([...el.querySelectorAll('nav')].map(n => n.getAttribute('aria-label'))).toEqual(['المساعدة', 'الشركة'])
    expect([...el.querySelectorAll('nav a')].map(a => a.getAttribute('href'))).toEqual(HREFS)
    expect(el.querySelector('.sf-mark')!.textContent).toBe('بحـ' + 'ـر')
    expect(el.querySelector('.sf-chip')!.textContent).toBe('الدفع عند الاستلام')
    expect(el.querySelector('.sf-rights')!.textContent).toBe(`© ${year} بحر. جميع الحقوق محفوظة.`)
    expect(el.querySelector('button[lang="ar"]')!.getAttribute('aria-pressed')).toBe('true')
  })

  it('switches language, direction and the pressed state, and remembers the choice', () => {
    const el = render('en')
    act(() => (el.querySelector('button[lang="ar"]') as HTMLButtonElement).click())
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(el.querySelector('button[lang="ar"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('button[lang="en"]')!.getAttribute('aria-pressed')).toBe('false')
    expect(JSON.parse(localStorage.getItem('bahr.store.v1')!).lang).toBe('ar')
  })
})
