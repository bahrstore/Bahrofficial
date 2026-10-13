import { useRef } from 'react'
import { PROMO_IMG } from '../data'
import { useScrollExpand } from '../motion'
import { useStore } from '../store'

/** Pinned section: a framed photo opens to full bleed as you scroll, then the copy fades in. */
export function Promo() {
  const { t, arrow, route } = useStore()
  const ref = useRef<HTMLElement>(null)
  useScrollExpand(ref)

  return (
    <section ref={ref} aria-labelledby="promo-h" style={{ position: 'relative' }}>
      <div data-se="track" className="se-track">
        <div className="se-stage">
          <div data-se="frame" className="se-frame">
            <div data-se="media" className="se-media">
              <img className="cover" src={PROMO_IMG} alt="" loading="lazy" />
            </div>
            <div data-se="scrim" aria-hidden="true" className="se-scrim" />
            <div data-se="overlay" className="se-overlay">
              <p className="eyebrow"><span className="diamond" />{t.promoEyebrow}</p>
              <h2 id="promo-h">{t.promoTitle}</h2>
              <p className="text">{t.promoText}</p>
              <div>
                <a href="/collections/car-accessories" onClick={route('/collections/car-accessories')} className="btn btn-light">
                  {t.promoCta}<span aria-hidden="true">{arrow}</span>
                </a>
              </div>
            </div>
          </div>
          <div data-se="title" aria-hidden="true" className="se-title">{t.promoEyebrow}</div>
          <div data-se="hint" aria-hidden="true" className="se-hint"><span>{t.scrollHint}</span><span className="line" /></div>
        </div>
      </div>
    </section>
  )
}
