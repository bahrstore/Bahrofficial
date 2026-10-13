import { useState } from 'react'
import { TRENDING_LIMIT } from '../data'
import { productCategory, type Category } from '../lib/product'
import { useCollection } from '../lib/useShopify'
import { useStore } from '../store'
import { useIsMobile } from '../useMedia'
import { ProductTile } from './ProductTile'
import { RubberSegment } from './RubberSegment'

const FILTERS: ('all' | Category)[] = ['all', 'car', 'mobile']

export function Trending() {
  const { t, lang, ar, arrow, route } = useStore()
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState<'all' | Category>('all')
  // The Shopify `trending` collection (same handle as /collections/trending), first TRENDING_LIMIT products only.
  // A missing collection (null) or an empty one shows no products; never the rest of the catalogue.
  const query = useCollection('trending', lang, TRENDING_LIMIT)
  const list = (query.data?.products.nodes ?? []).slice(0, TRENDING_LIMIT).filter(p => filter === 'all' || productCategory(p) === filter)

  return (
    <section id="trending" aria-labelledby="tr-h" className="trending">
      <div className="wrap">
        <div data-anim="up" className="section-head">
          <div>
            <p className="eyebrow"><span className="diamond" />{t.trEyebrow}</p>
            <h2 id="tr-h" className="h2">{t.trTitle}</h2>
          </div>
          <div className="head-tools">
            <RubberSegment
              className="filter-seg"
              items={FILTERS.map((k, i) => ({ value: k, label: t.filters[i] }))}
              value={filter}
              onChange={setFilter}
              aria-label={t.filterLabel}
              dir={ar ? 'rtl' : 'ltr'}
              trackColor="rgba(255, 253, 248, .75)"
              thumbColor="#11604B"
              textColor="#4A4F4B"
              activeTextColor="#FAF8F3"
              size={isMobile ? 'md' : 'lg'}
              radius={isMobile ? 18 : 22}
              inset={isMobile ? 3 : 4}
            />
            <a href="/collections/trending" onClick={route('/collections/trending')} className="view-all">
              {t.viewAll}<span aria-hidden="true" className="ring">{arrow}</span>
            </a>
          </div>
        </div>

        {query.loading && (
          <ul aria-busy="true" aria-label={t.loading} className="products">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="sk-card">
                <div className="sk sk-media" />
                <div className="sk-body">
                  <div className="sk" style={{ height: 10, width: '45%' }} />
                  <div className="sk" style={{ height: 14, width: '90%' }} />
                  <div className="sk sk-price" />
                  <div className="sk-btn" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {query.error ? (
          <div role="alert" className="plp-state error">
            <span className="state-diamond" />
            <h3>{t.errTitle}</h3>
            <p>{t.errText}</p>
            <div className="state-actions">
              <button type="button" className="btn btn-solid" onClick={query.reload}>{t.retry}</button>
            </div>
          </div>
        ) : null}
        {query.data && (
          <ul data-anim="stagger" className="products">
            {list.map(p => <ProductTile key={p.id} p={p} />)}
          </ul>
        )}
      </div>
    </section>
  )
}
