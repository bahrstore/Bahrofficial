import { useStore } from '../store'
import { TrustIcon } from './Icons'

export function Trust() {
  const { t, arrow, route } = useStore()
  return (
    <section aria-labelledby="trust-h" className="trust">
      <div aria-hidden="true" className="trust-deco a" />
      <div aria-hidden="true" className="trust-deco b" />
      <div className="wrap trust-grid">
        <div data-anim="up" className="trust-intro">
          <p className="eyebrow"><span className="diamond" />{t.trustEyebrow}</p>
          <h2 id="trust-h">{t.trustTitle}</h2>
          <span aria-hidden="true" className="trust-rule" />
        </div>
        <ol data-anim="stagger" className="trust-list">
          {t.trust.map(([title, text, linkText], i) => (
            <li key={i} className="trust-item">
              <span className="trust-icon"><TrustIcon i={i} /></span>
              <div className="trust-body">
                <div className="trust-row">
                  <h3>{title}</h3>
                  <span aria-hidden="true" className="trust-num">0{i + 1}</span>
                </div>
                <p>{text}</p>
                {linkText && (
                  <a href="/pages/returns" onClick={route('/pages/returns')} className="trust-link">
                    {linkText}<span aria-hidden="true" className="ring">{arrow}</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
