import type { FocusEvent, MouseEvent } from 'react'
import { IMG, NAV_HREFS } from '../data'
import { useReducedMotion } from '../motion'
import { useStore } from '../store'

const KEYS = ['car', 'mobile', 'trending'] as const
const REPS = [0, 1, 2, 3, 4, 5, 6, 7]

export function Collections() {
  const { t, route } = useStore()
  const reduced = useReducedMotion()

  // Hover reveal: the marquee slides in from whichever edge the pointer entered, and leaves the same way.
  const move = (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>, enter: boolean) => {
    const item = e.currentTarget.parentElement
    const m = item?.querySelector<HTMLElement>('.fm-marquee'), inn = item?.querySelector<HTMLElement>('.fm-inner')
    if (!item || !m || !inn) return
    const r = item.getBoundingClientRect()
    const y = 'clientY' in e && e.type.startsWith('mouse') ? e.clientY - r.top : r.height
    const top = y < r.height / 2
    const ease = reduced ? 'none' : 'transform .6s cubic-bezier(.19,1,.22,1)'
    const out = (sign: boolean) => `translate3d(0,${sign ? '-101%' : '101%'},0)`
    if (enter) {
      m.style.transition = inn.style.transition = 'none'
      m.style.transform = out(top)
      inn.style.transform = out(!top)
      void m.offsetHeight
      m.style.transition = inn.style.transition = ease
      m.style.transform = inn.style.transform = 'translate3d(0,0,0)'
    } else {
      m.style.transition = inn.style.transition = ease
      m.style.transform = out(top)
      inn.style.transform = out(!top)
    }
  }

  return (
    <section id="collections" aria-labelledby="cat-h" className="collections">
      <div data-anim="up" className="wrap collections-head">
        <div>
          <p className="eyebrow">{t.catEyebrow}</p>
          <h2 id="cat-h" className="h2">{t.catTitle}</h2>
        </div>
      </div>
      <nav aria-label={t.catEyebrow} className="fm-list">
        {KEYS.map((k, i) => {
          const href = NAV_HREFS[i + 1]
          const title = t.cats[i]
          return (
            <div key={k} className="fm-item">
              <a
                href={href} className="fm-link"
                onClick={route(href)}
                onMouseEnter={(e) => move(e, true)} onMouseLeave={(e) => move(e, false)}
                onFocus={(e) => move(e, true)} onBlur={(e) => move(e, false)}
              >
                <span className="fm-num">0{i + 1}</span>{title}
              </a>
              <div aria-hidden="true" className="fm-marquee">
                <div dir="ltr" className="fm-inner">
                  <div className="fm-track">
                    {REPS.map(r => (
                      <div key={r} className="fm-rep">
                        <span className="fm-rep-text">{title}</span>
                        <span className="fm-rep-img" style={{ backgroundImage: `url('${IMG[k][0]}')` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </nav>
    </section>
  )
}
