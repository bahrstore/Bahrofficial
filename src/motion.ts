import { useEffect, useState, type RefObject } from 'react'

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useReducedMotion() {
  const [reduced] = useState(prefersReduced)
  return reduced
}

/**
 * Fade/slide-in for elements marked with data-anim:
 *  - "hero": children animate in on mount, staggered
 *  - "up": the element animates in when it enters the viewport
 *  - "stagger": its children animate in, staggered, when it enters the viewport
 */
export function useReveal() {
  useEffect(() => {
    if (prefersReduced() || !('IntersectionObserver' in window)) return
    const E = 'cubic-bezier(.2,.7,.2,1)'
    const prepped = new Set<HTMLElement>()
    const seen = new WeakSet<Element>()
    const timers: number[] = []
    const prep = (el: HTMLElement, d: number) => {
      prepped.add(el)
      el.style.opacity = '0'
      el.style.translate = '0 22px'
      el.style.transition = `opacity .8s ${E} ${d}ms, translate .8s ${E} ${d}ms`
    }
    const show = (el: HTMLElement) => {
      el.style.opacity = '1'
      el.style.translate = '0 0'
      timers.push(window.setTimeout(() => { el.style.transition = ''; prepped.delete(el) }, 1800))
    }
    const io = new IntersectionObserver((entries) => entries.forEach(e => {
      if (!e.isIntersecting) return
      io.unobserve(e.target)
      const el = e.target as HTMLElement
      if (el.dataset.anim === 'stagger') ([...el.children] as HTMLElement[]).forEach(show)
      else show(el)
    }), { rootMargin: '0px 0px -5% 0px', threshold: 0 })

    const scan = () => document.querySelectorAll<HTMLElement>('[data-anim]').forEach(el => {
      if (seen.has(el)) return
      const mode = el.dataset.anim
      const kids = [...el.children] as HTMLElement[]
      if (mode === 'hero') {
        seen.add(el)
        kids.forEach((k, i) => { prep(k, 120 + i * 110); requestAnimationFrame(() => requestAnimationFrame(() => show(k))) })
        return
      }
      if (mode === 'stagger') { if (!kids.length) return; kids.forEach((k, i) => prep(k, Math.min(i, 7) * 90)) }
      else prep(el, 0)
      seen.add(el)
      io.observe(el)
    })
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.querySelector('main') || document.body, { childList: true, subtree: true })
    // Safety net: never leave something invisible that's already on screen.
    const safety = window.setInterval(() => prepped.forEach(el => {
      if (el.style.opacity === '0' && el.getBoundingClientRect().top < innerHeight) show(el)
    }), 1500)

    return () => {
      io.disconnect(); mo.disconnect(); clearInterval(safety); timers.forEach(clearTimeout)
      prepped.forEach(el => { el.style.opacity = ''; el.style.translate = ''; el.style.transition = '' })
    }
  }, [])
}

/** Eased wheel scrolling for fine pointers; leaves fixed layers and inner scrollers alone. */
export function useSmoothWheel() {
  useEffect(() => {
    if (prefersReduced() || !matchMedia('(pointer: fine)').matches) return
    const root = document.documentElement
    let target = scrollY, cur = scrollY, raf = 0, ours = false
    const max = () => root.scrollHeight - innerHeight
    const step = () => {
      cur += (target - cur) * 0.12
      if (Math.abs(target - cur) < 0.5) { cur = target; raf = 0 }
      ours = true
      root.style.scrollBehavior = 'auto'
      window.scrollTo(0, cur)
      if (raf) raf = requestAnimationFrame(step); else root.style.scrollBehavior = ''
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return
      let n = e.target as Node | null
      while (n && n !== document.body) {
        if (n.nodeType === 1) {
          const el = n as HTMLElement, cs = getComputedStyle(el)
          if (cs.position === 'fixed' || (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight)) return
        }
        n = n.parentNode
      }
      e.preventDefault()
      const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY
      if (!raf) { cur = scrollY; target = scrollY }
      target = Math.max(0, Math.min(max(), target + d))
      if (!raf) raf = requestAnimationFrame(step)
    }
    const onScroll = () => { if (ours) { ours = false; return } if (!raf) cur = target = scrollY }
    const stop = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; root.style.scrollBehavior = '' }
      cur = target = scrollY
    }
    addEventListener('wheel', onWheel, { passive: false })
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('keydown', stop)
    addEventListener('mousedown', stop)
    return () => {
      removeEventListener('wheel', onWheel); removeEventListener('scroll', onScroll)
      removeEventListener('keydown', stop); removeEventListener('mousedown', stop)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}

/** Scroll-driven "window opens to full bleed" effect for the promo section. */
export function useScrollExpand(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = prefersReduced()
    const q = (n: string) => root.querySelector<HTMLElement>(`[data-se="${n}"]`)
    const track = q('track'), frame = q('frame'), media = q('media')
    const scrim = q('scrim'), title = q('title'), hint = q('hint'), overlay = q('overlay')
    if (!track || !frame || !media) return
    const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
    const ss = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1); return t * t * (3 - 2 * t) }

    const apply = (p: number) => {
      const narrow = innerWidth < 720
      const sw = narrow ? 78 : 42, sh = narrow ? 46 : 58, r0 = 24
      const e = ss(0, 1, p)
      const w = sw + (100 - sw) * e, hh = sh + (100 - sh) * e
      frame.style.clipPath = `inset(${(100 - hh) / 2}% ${(100 - w) / 2}% ${(100 - hh) / 2}% ${(100 - w) / 2}% round ${r0 * (1 - e)}px)`
      media.style.transform = `scale(${1.35 - 0.35 * e})`
      if (scrim) scrim.style.opacity = String(e)
      if (title) { const o = ss(0.4, 0.88, p); title.style.opacity = String(1 - o); title.style.transform = `translate3d(0,${-28 * o}px,0) scale(${1 + 0.06 * o})` }
      if (hint) { const g = ss(0, 0.12, p); hint.style.opacity = String(1 - g); hint.style.transform = `translate3d(0,${8 * g}px,0)` }
      if (overlay) { const i = ss(0.68, 1, p); overlay.style.opacity = String(i); overlay.style.transform = `translate3d(0,${18 * (1 - i)}px,0)`; overlay.style.pointerEvents = i > 0.6 ? 'auto' : 'none' }
    }
    const read = () => clamp(-track.getBoundingClientRect().top / (innerHeight * 1.2), 0, 1)

    let cur = 0, target = 0, raf = 0
    const k = 1 - Math.exp(-1 / (60 * 0.1))
    const tick = () => {
      cur += (target - cur) * k
      if (Math.abs(target - cur) < 0.0004) { cur = target; raf = 0 }
      apply(cur)
      if (raf) raf = requestAnimationFrame(tick)
    }
    const onScroll = () => {
      target = read()
      if (reduced) { cur = target; apply(cur); return }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onResize = () => { cur = target = read(); apply(cur) }
    onResize()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onResize)
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf) }
  }, [rootRef])
}
