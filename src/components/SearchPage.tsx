import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSearch } from '../lib/useShopify'
import { useStore } from '../store'
import { useIsDesktop, useIsMobile } from '../useMedia'
import { ProductTile } from './ProductTile'

/** Results of Shopify's storefront search for /search?q=…, opened by pressing Enter in the header search. */
export function SearchPage() {
  const { t, lang, num, route } = useStore()
  const isDesktop = useIsDesktop()
  const isMobile = useIsMobile()
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const query = useSearch(q, lang)
  const products = query.data ?? []
  const title = q ? t.searchResultsFor(q) : t.searchTitle

  useEffect(() => {
    document.title = `${title} — Bahr`
    document.querySelector('meta[name="description"]')?.setAttribute('content', title)
  }, [title])

  // Roughly how many cards fit in a row (the grid itself is CSS auto-fill); used for skeletons and eager images.
  const cols = isMobile ? 2 : isDesktop ? 5 : 3
  const loading = !!q && query.loading
  const ready = !!q && !!query.data

  let state: { kind: 'error' | 'empty'; title: string; text: string; primary: string; onPrimary: () => void } | null = null
  if (!q) state = { kind: 'empty', title: t.searchTitle, text: t.searchPrompt, primary: t.browseOther, onPrimary: route('/collections/trending') }
  else if (query.error) state = { kind: 'error', title: t.searchError, text: t.errText, primary: t.retry, onPrimary: query.reload }
  else if (ready && products.length === 0) state = { kind: 'empty', title: t.searchEmpty(q), text: t.searchTry, primary: t.browseOther, onPrimary: route('/collections/trending') }

  return (
    <section aria-labelledby="grid-h" className="plp">
      <div className="wrap plp-wrap">
        <div className="plp-head">
          <div className="plp-title">
            <h1 id="grid-h">{title}</h1>
            <p aria-live="polite" className="plp-count">{ready ? t.count(num(products.length)) : ''}</p>
          </div>
        </div>

        <div className="plp-layout">
          <div className="plp-main">
            {loading && (
              <ul aria-busy="true" aria-label={t.searching} className="plp-grid">
                {Array.from({ length: cols }, (_, i) => (
                  <li key={i} className="sk-card">
                    <div className="sk sk-media" />
                    <div className="sk-body">
                      <div className="sk" style={{ height: 10, width: '45%' }} />
                      <div className="sk" style={{ height: 14, width: '90%' }} />
                      <div className="sk" style={{ height: 14, width: '60%' }} />
                      <div className="sk sk-price" />
                      <div className="sk-btn" />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {ready && products.length > 0 && (
              <ul className="plp-grid">
                {products.map((p, i) => <ProductTile key={p.id} p={p} eager={i < cols} />)}
              </ul>
            )}

            {state && (
              <div role={state.kind === 'error' ? 'alert' : 'status'} className={'plp-state ' + state.kind}>
                <span className="state-diamond" />
                <h2>{state.title}</h2>
                <p>{state.text}</p>
                <div className="state-actions">
                  <button type="button" className="btn btn-solid" onClick={state.onPrimary}>{state.primary}</button>
                  <a href="/" onClick={route('/')} className="btn btn-outline">{t.backHome}</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
