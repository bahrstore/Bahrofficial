import { useEffect } from 'react'
import { useStore } from '../store'

/** For URLs the app doesn't have a page for, and collection handles Shopify doesn't know. */
export function NotFound() {
  const { t, route } = useStore()
  useEffect(() => {
    document.title = `${t.pageNfTitle} — Bahr`
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.pageNfText)
  }, [t])
  return (
    <section className="pdp">
      <div className="wrap pdp-wrap">
        <div role="status" className="plp-state">
          <span className="state-diamond" />
          <h1>{t.pageNfTitle}</h1>
          <p>{t.pageNfText}</p>
          <div className="state-actions">
            <a href="/" onClick={route('/')} className="btn btn-solid">{t.backHome}</a>
            <a href="/collections/trending" onClick={route('/collections/trending')} className="btn btn-outline">{t.browseOther}</a>
          </div>
        </div>
      </div>
    </section>
  )
}
