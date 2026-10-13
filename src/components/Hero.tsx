import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { HERO_FOCUS, HERO_IMG } from '../data'
import { useReducedMotion } from '../motion'
import { useStore } from '../store'

const SLIDE_MS = 6000

export function Hero() {
  const { t, ar, arrow, pad, scrollToId } = useStore()
  const reduced = useReducedMotion()
  const [cur, setCur] = useState(0)
  const [paused, setPaused] = useState(false)
  // Progress bar restarts from 0 on every slide change, then fills over SLIDE_MS.
  const [fillOn, setFillOn] = useState(false)
  const [cycle, setCycle] = useState(0)
  const touchX = useRef(0)

  const go = useCallback((i: number, manual = true) => {
    setCur((i + 3) % 3)
    setFillOn(false)
    if (manual) setCycle(c => c + 1)
  }, [])

  useEffect(() => {
    if (fillOn) return
    const id = setTimeout(() => setFillOn(true), 80)
    return () => clearTimeout(id)
  }, [fillOn])

  // Auto-advance; restarts whenever the user navigates manually.
  useEffect(() => {
    if (reduced || paused) return
    const id = setInterval(() => {
      if (document.hidden) return
      setCur(c => (c + 1) % 3)
      setFillOn(false)
    }, SLIDE_MS)
    return () => clearInterval(id)
  }, [reduced, paused, cycle])

  const stopped = paused || reduced
  const slides = t.slides

  return (
    <section aria-labelledby="hero-h" className="hero">
      <div className="hero-grid">
        <div data-anim="hero" className="hero-copy">
          <p className="eyebrow"><span className="diamond" />{t.heroEyebrow}</p>
          <h1 id="hero-h">
            <span>{t.heroA}</span>
            <span className="accent">{t.heroB}</span>
          </h1>
          <p className="hero-sub">{t.heroSub}</p>
          <div className="hero-ctas">
            <a href="#trending" onClick={scrollToId('trending')} className="btn btn-primary">{t.ctaPrimary}<span aria-hidden="true">{arrow}</span></a>
            <a href="#collections" onClick={scrollToId('collections')} className="btn btn-outline">{t.ctaSecondary}</a>
          </div>
          <ul className="hero-notes">
            <li><span className="diamond" />{t.heroNote1}</li>
            <li><span className="diamond" />{t.heroNote2}</li>
          </ul>
        </div>

        <div
          role="region" aria-roledescription="carousel" aria-label={t.slideAria} className="stage"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const d = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(d) > 40) go(cur + ((d < 0) !== ar ? 1 : -1))
          }}
        >
          <div className="slides" style={{ transform: `translateX(${ar ? cur * 100 : -cur * 100}%)` }}>
            {slides.map(([eyebrow, title, sub], i) => {
              const current = i === cur
              return (
                <div key={i} style={{ '--focus': HERO_FOCUS[i] } as CSSProperties} role="group" aria-roledescription="slide" aria-label={`${pad(i + 1)} / ${pad(3)}`} aria-hidden={!current} className={'slide' + (current ? ' is-current' : '')}>
                  <div className={'slide-media' + (reduced ? '' : ' zoom')}>
                    <img className="cover" src={HERO_IMG[i]} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
                  </div>
                  <div aria-hidden="true" className="scrim" />
                  <div className="slide-copy">
                    <span className="slide-eyebrow"><span className="diamond" />{eyebrow}</span>
                    <span className="slide-title">{title}</span>
                    <span className="slide-sub">{sub}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="stage-ctrl">
            <span aria-live="polite" className="stage-count">{pad(cur + 1)} / {pad(3)}</span>
            <button type="button" className="round-btn" onClick={() => go(cur - 1)} aria-label={t.prevSlide}>{ar ? '→' : '←'}</button>
            <button type="button" className="round-btn" onClick={() => go(cur + 1)} aria-label={t.nextSlide}>{arrow}</button>
          </div>
          <div className="slide-tabs">
            {slides.map(([label], i) => {
              const fill = i < cur ? '100%' : i === cur ? (stopped || fillOn ? '100%' : '0%') : '0%'
              const dur = i === cur && !stopped && fillOn ? `${SLIDE_MS / 1000}s` : '0s'
              return (
                <button key={i} type="button" className="slide-tab" onClick={() => go(i)} aria-label={label} aria-current={i === cur}>
                  <span className="label">{label}</span>
                  <span aria-hidden="true" className="bar"><span className="fill" style={{ width: fill, transition: `width ${dur} linear` }} /></span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
