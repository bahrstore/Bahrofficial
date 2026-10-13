import { useEffect, useMemo } from 'react'
import { usePolicy } from '../lib/useShopify'
import { sanitizeHtml } from '../lib/sanitize'
import type { PolicyKind } from '../lib/types'
import { useStore } from '../store'

/** A store policy as written in Shopify admin (Settings → Policies). Nothing is shown that Shopify doesn't return. */
export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const { t, lang, route } = useStore()
  const { data, error, loading, reload } = usePolicy(kind, lang)
  const fallbackTitle = t.policyTitles[kind]
  const html = useMemo(() => (data ? sanitizeHtml(data.body) : ''), [data])

  useEffect(() => {
    document.title = `${data?.title || fallbackTitle} — Bahr`
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${data?.title || fallbackTitle} — Bahr`)
  }, [data, fallbackTitle])

  return (
    <section className="pdp" aria-busy={loading}>
      <div className="wrap pdp-wrap policy-wrap">
        <nav aria-label={t.breadcrumb} className="crumbs">
          <ol>
            <li><a href="/" onClick={route('/')}>{t.home}</a></li>
            <li><span aria-current="page">{data?.title || fallbackTitle}</span></li>
          </ol>
        </nav>
        {loading ? (
          <div className="policy-body">
            <div className="sk" style={{ height: 34, width: '50%' }} />
            {[90, 100, 80, 95].map((w, i) => <div key={i} className="sk" style={{ height: 14, width: `${w}%`, marginTop: 16 }} />)}
          </div>
        ) : data ? (
          <article className="policy-body">
            <h1>{data.title}</h1>
            {/* Shopify-authored HTML, sanitised above. */}
            <div className="policy-html" dangerouslySetInnerHTML={{ __html: html }} />
          </article>
        ) : (
          <div role={error ? 'alert' : 'status'} className={'plp-state' + (error ? ' error' : '')}>
            <span className="state-diamond" />
            <h1>{error ? t.policyErrTitle : fallbackTitle}</h1>
            <p>{error ? t.errText : t.policyMissing}</p>
            <div className="state-actions">
              {!!error && <button type="button" className="btn btn-solid" onClick={reload}>{t.retry}</button>}
              <a href="/" onClick={route('/')} className="btn btn-outline">{t.backHome}</a>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
