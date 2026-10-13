import { FOOT_HREFS } from '../data'
import type { Lang } from '../lib/types'
import { useStore } from '../store'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

export function Footer() {
  const { t, lang, setLang, route } = useStore()
  const [upright, italic] = t.wordmark
  return (
    <footer className="site-footer">
      <div className="sf-wrap">
        <div className="sf-top">
          {/* Decorative: the brand name is announced by the header logo. */}
          <p aria-hidden="true" className="sf-mark">
            <span className="sf-mark-a">{upright}</span>
            <span className="sf-mark-b">{italic}</span>
          </p>
          <div className="sf-cols">
            {t.foot.map(([title, links], i) => (
              <nav key={title} aria-label={title}>
                <ul>
                  {links.map((label, j) => (
                    <li key={label}>
                      <a href={FOOT_HREFS[i][j]} onClick={route(FOOT_HREFS[i][j])}>
                        <span>{label}</span>
                        <span aria-hidden="true" className="sf-arrow">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="sf-bottom">
          <p className="sf-pay">
            <span>{t.weAccept}</span>
            <span className="sf-chip">{t.cod}</span>
          </p>
          <div role="group" aria-label={t.language} className="sf-lang">
            {LANGS.map(l => (
              <button key={l.value} type="button" lang={l.value} aria-pressed={lang === l.value} onClick={() => setLang(l.value)}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="sf-rights">{t.rights(new Date().getFullYear())}</p>
        </div>
      </div>
    </footer>
  )
}
