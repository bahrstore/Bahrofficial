import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { COLLECTIONS } from '../data'
import {
  defaultVariant, discountPercent, hasOnlyDefaultVariant, productBadge, productCollection, reviewSummary, variantCompareAt,
} from '../lib/product'
import type { Product, ProductVariant } from '../lib/types'
import { useProduct, useRecommendations, useReviews } from '../lib/useShopify'
import { useStore } from '../store'
import { useIsMobile } from '../useMedia'
import { CheckIcon, HeartIcon } from './Icons'
import { ProductGallery } from './ProductGallery'
import { ProductReviews } from './ProductReviews'
import { ProductTile } from './ProductTile'
import { Stars } from './Stars'

type PreviewState = 'live' | 'loading' | 'error'
const PREVIEW_STATES: PreviewState[] = ['live', 'loading', 'error']
/** Upper bound for the quantity stepper when Shopify doesn't share stock levels. */
const MAX_QTY = 99

const numericId = (gid: string) => gid.split('/').pop() ?? gid

export function ProductPage({ handle }: { handle: string }) {
  const { t, lang, route } = useStore()
  const [params, setParams] = useSearchParams()

  // Dev-only: ?preview=loading|error shows the other page states.
  const previewParam = params.get('preview') as PreviewState
  const preview: PreviewState = import.meta.env.DEV && PREVIEW_STATES.includes(previewParam) ? previewParam : 'live'

  const query = useProduct(handle, lang)
  const loading = preview === 'loading' || (preview !== 'error' && query.loading)
  const error = !loading && (preview === 'error' || !!query.error)
  const product = !loading && !error ? query.data ?? null : null

  useEffect(() => {
    if (loading) return
    const title = product ? product.title : error ? t.pdpErrTitle : t.nfTitle
    document.title = `${title} — Bahr`
    const desc = product?.description || (product ? `${product.title} — ${t.tagline}` : t.nfText)
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
  }, [loading, error, product, t])

  if (loading) return <ProductSkeleton />

  if (!product) {
    const retry = () => {
      if (preview === 'error') setParams(prev => { const next = new URLSearchParams(prev); next.delete('preview'); return next }, { replace: true })
      else query.reload()
    }
    return (
      <section className="pdp">
        <div className="wrap pdp-wrap">
          <div role={error ? 'alert' : 'status'} className={'plp-state' + (error ? ' error' : '')}>
            <span className="state-diamond" />
            <h1>{error ? t.pdpErrTitle : t.nfTitle}</h1>
            <p>{error ? t.errText : t.nfText}</p>
            <div className="state-actions">
              {error
                ? <button type="button" className="btn btn-solid" onClick={retry}>{t.retry}</button>
                : <a href="/collections/trending" onClick={route('/collections/trending')} className="btn btn-solid">{t.browseOther}</a>}
              <a href="/" onClick={route('/')} className="btn btn-outline">{t.backHome}</a>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Keyed so another product (or a language switch that reloads data) never inherits a stale variant.
  return <ProductView key={product.id} product={product} />
}

function ProductView({ product: p }: { product: Product }) {
  const { t, lang, num, money, wish, toggleWish, addToCart, buyNow, route } = useStore()
  const isMobile = useIsMobile()
  const [params, setParams] = useSearchParams()
  const variants = p.variants.nodes
  const reviews = useReviews(p.id, lang).data ?? []

  // ?variant=<id> selects a variant, as on Shopify themes, so a shared or reloaded link keeps the choice.
  const [variantId, setVariantId] = useState(() => {
    const fromUrl = params.get('variant')
    return (fromUrl && variants.find(v => numericId(v.id) === fromUrl)?.id) || defaultVariant(p)?.id
  })
  const variant: ProductVariant | undefined = variants.find(v => v.id === variantId) ?? variants[0]
  const [qty, setQty] = useState(1)
  const [status, setStatus] = useState<'idle' | 'busy' | 'added' | 'error'>('idle')
  const [buying, setBuying] = useState(false)
  // Coming back from Shopify checkout with the browser's Back button can restore this page from the
  // back-forward cache; reset the button instead of leaving it on "Going to checkout…".
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) setBuying(false) }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])
  const addedTimer = useRef(0)
  useEffect(() => () => clearTimeout(addedTimer.current), [])

  const actionsRef = useRef<HTMLDivElement>(null)
  const [actionsAbove, setActionsAbove] = useState(false)
  useEffect(() => {
    const el = actionsRef.current
    if (!isMobile || !el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setActionsAbove(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [isMobile])

  if (!variant) return null

  const showOptions = !hasOnlyDefaultVariant(p)
  const price = variant.price
  const compare = variantCompareAt(variant)
  const canBuy = variant.availableForSale
  const stock = variant.quantityAvailable
  const maxQty = canBuy ? (stock != null && stock > 0 ? Math.min(stock, MAX_QTY) : MAX_QTY) : 1
  const quantity = Math.min(qty, maxQty)
  const collection = productCollection(p)
  const colLabel = collection ? t.cols[COLLECTIONS[collection].key].label : null
  const badge = productBadge(p)
  const wished = !!wish[p.id]
  const sku = variant.sku?.trim()
  const images = p.images.nodes.length ? p.images.nodes : p.featuredImage ? [p.featuredImage] : []

  const selectVariant = (v: ProductVariant) => {
    setVariantId(v.id)
    setStatus('idle')
    setParams(prev => { const next = new URLSearchParams(prev); next.set('variant', numericId(v.id)); return next }, { replace: true, preventScrollReset: true })
  }

  // The variant with `name` set to `value` and the other options as currently selected, if it exists.
  const variantWith = (name: string, value: string) =>
    variants.find(v => variant.selectedOptions.every(o => {
      const want = o.name === name ? value : o.value
      return v.selectedOptions.some(s => s.name === o.name && s.value === want)
    }))
  const pick = (name: string, value: string) => {
    const exact = variantWith(name, value)
    // No exact combination: fall back to a variant with this value, preferring one that can be bought.
    const fallback = variants
      .filter(v => v.selectedOptions.some(o => o.name === name && o.value === value))
      .sort((a, b) => Number(b.availableForSale) - Number(a.availableForSale))[0]
    const next = exact ?? fallback
    if (next) selectVariant(next)
  }

  const add = async () => {
    if (!canBuy || status === 'busy') return null
    setStatus('busy')
    const cart = await addToCart(p, { variantId: variant.id, quantity })
    clearTimeout(addedTimer.current)
    setStatus(cart ? 'added' : 'error')
    if (cart) addedTimer.current = window.setTimeout(() => setStatus(s => (s === 'added' ? 'idle' : s)), 1800)
    return cart
  }

  // Buy now skips the shopping cart: a one-item checkout for this variant and quantity, straight to Shopify.
  const checkoutNow = async () => {
    if (!canBuy || buying || status === 'busy') return
    setBuying(true)
    setStatus('idle')
    const href = await buyNow(p, { variantId: variant.id, quantity })
    if (href) window.location.assign(href) // stays "Going to checkout…" while the browser leaves
    else setBuying(false)
  }

  const addLabel = !canBuy ? t.soldOut : status === 'busy' ? t.adding : status === 'added' ? t.added : t.add

  return (
    <>
      <section className="pdp" aria-labelledby="pdp-title">
        <div className="wrap pdp-wrap">
          <nav aria-label={t.breadcrumb} className="crumbs">
            <ol>
              <li><a href="/" onClick={route('/')}>{t.home}</a></li>
              {collection && colLabel && <li><a href={`/collections/${collection}`} onClick={route(`/collections/${collection}`)}>{colLabel}</a></li>}
              <li><span aria-current="page">{p.title}</span></li>
            </ol>
          </nav>

          <div className="pdp-grid">
            <ProductGallery
              images={images} title={p.title} productType={p.productType} focusUrl={variant.image?.url}
              badge={badge && <span className="pdp-badge">{t[`badge_${badge}`]}</span>}
            />

            <div className="pdp-info">
              {p.vendor && <p className="pdp-vendor">{p.vendor}</p>}
              <h1 id="pdp-title" className="pdp-title">{p.title}</h1>
              <Stars rating={p.rating ?? reviewSummary(reviews).rating} size={18} detail />

              <div className="pdp-price-row">
                <p className="pdp-price">
                  <span className="now">{money(price)}</span>
                  {compare && <s><span className="sr-only">{t.wasPrice} </span>{money(compare)}</s>}
                </p>
                {compare && <span className="pdp-save">{t.save(num(discountPercent(price, compare)))}</span>}
              </div>
              <p className={'pdp-stock' + (canBuy ? ' in' : ' out')}>
                <span aria-hidden="true" className="dot" />
                {!canBuy ? t.soldOut : stock != null && stock > 0 && stock <= 5 ? t.onlyLeft(num(stock)) : t.inStockL}
              </p>

              <div className="pdp-buy">
                {showOptions && p.options.map(o => {
                  const chosen = variant.selectedOptions.find(s => s.name === o.name)?.value
                  return (
                    <fieldset key={o.name} className="pdp-option">
                      <legend>{o.name}<span className="chosen">{chosen}</span></legend>
                      <div className="pdp-values">
                        {o.optionValues.map(({ name: value }) => {
                          const v = variantWith(o.name, value)
                          const state = !v ? 'none' : v.availableForSale ? 'ok' : 'soldout'
                          return (
                            <label key={value} className={'pdp-value ' + state}>
                              <input type="radio" className="sr-only" name={`opt-${o.name}`} value={value} checked={chosen === value} onChange={() => pick(o.name, value)} />
                              <span>{value}</span>
                              {state !== 'ok' && <span className="sr-only"> — {state === 'none' ? t.unavailableSr : t.soldOutSr}</span>}
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  )
                })}

                <div ref={actionsRef} className="pdp-actions">
                  <div role="group" aria-label={t.qty} className="pdp-qty">
                    <button type="button" onClick={() => setQty(Math.max(1, quantity - 1))} disabled={!canBuy || quantity <= 1} aria-label={t.decrease}>−</button>
                    <input
                      type="number" inputMode="numeric" min={1} max={maxQty} value={quantity} disabled={!canBuy} aria-label={t.qty}
                      onChange={(e) => { const n = Math.floor(Number(e.target.value)); if (Number.isFinite(n)) setQty(Math.min(maxQty, Math.max(1, n))) }}
                    />
                    <button type="button" onClick={() => setQty(Math.min(maxQty, quantity + 1))} disabled={!canBuy || quantity >= maxQty} aria-label={t.increase}>+</button>
                  </div>
                  <button type="button" className={'btn btn-solid pdp-add' + (status === 'added' ? ' just' : '')} onClick={add} disabled={!canBuy || buying} aria-busy={status === 'busy'}>
                    {status === 'added' && <CheckIcon size={18} />}{addLabel}
                  </button>
                  <button type="button" className="btn btn-outline pdp-now" onClick={checkoutNow} disabled={!canBuy || status === 'busy' || buying} aria-busy={buying}>
                    {buying ? t.goingToCheckout : t.buyNow}
                  </button>
                </div>
                {status === 'error' && <p role="alert" className="pdp-error">{t.addFailed}</p>}

                <div className="pdp-secondary">
                  <button type="button" className="pdp-link" onClick={() => toggleWish(p.id)} aria-pressed={wished}>
                    <HeartIcon size={18} />{wished ? t.wishSaved : t.wishAdd}
                  </button>
                </div>
              </div>

              <dl className="pdp-meta">
                {sku && <div><dt>{t.sku}</dt><dd>{sku}</dd></div>}
                {p.vendor && <div><dt>{t.vendor}</dt><dd>{p.vendor}</dd></div>}
                {collection && (
                  <div>
                    <dt>{t.category}</dt>
                    <dd><a href={`/collections/${collection}`} onClick={route(`/collections/${collection}`)}>{colLabel}</a></dd>
                  </div>
                )}
                {p.productType && <div><dt>{t.productType}</dt><dd className="cap">{p.productType}</dd></div>}
              </dl>

              <div className="pdp-details">
                {p.description && (
                  <details open>
                    <summary>{t.description}</summary>
                    <div className="pdp-panel"><p className="pdp-desc">{p.description}</p></div>
                  </details>
                )}
                <details>
                  <summary>{t.deliveryTitle}</summary>
                  <div className="pdp-panel">
                    <p>{t.trust[0][1]}</p>
                    <p>{t.trust[1][1]}</p>
                    <PanelLink href="/pages/delivery" label={t.deliveryLink} route={route} />
                  </div>
                </details>
                <details>
                  <summary>{t.returnsTitle}</summary>
                  <div className="pdp-panel">
                    <p>{t.trust[2][1]}</p>
                    <PanelLink href="/pages/returns" label={t.trust[2][2]} route={route} />
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProductReviews reviews={reviews} />
      <Related productId={p.id} />

      {isMobile && (
        <div className={'pdp-bar' + (actionsAbove ? ' show' : '')} aria-hidden={!actionsAbove} inert={!actionsAbove}>
          <div className="pdp-bar-info">
            <span className="name">{p.title}{showOptions && <span className="var"> · {variant.title}</span>}</span>
            <span className="price">{money(price)}{quantity > 1 && <span className="var"> × {num(quantity)}</span>}</span>
          </div>
          <button type="button" className={'btn btn-solid' + (status === 'added' ? ' just' : '')} onClick={add} disabled={!canBuy} aria-busy={status === 'busy'}>
            {addLabel}
          </button>
        </div>
      )}
    </>
  )
}

function PanelLink({ href, label, route }: { href: string; label: string; route: (path: string) => (e?: MouseEvent) => void }) {
  const { arrow } = useStore()
  return <a href={href} onClick={route(href)} className="pdp-panel-link">{label}<span aria-hidden="true">{arrow}</span></a>
}

function Related({ productId }: { productId: string }) {
  const { t, lang } = useStore()
  const products = (useRecommendations(productId, lang).data ?? []).filter(p => p.id !== productId).slice(0, 4)
  if (!products.length) return null
  return (
    <section aria-labelledby="related-h" className="pdp-related">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow"><span className="diamond" />{t.relatedEyebrow}</p>
            <h2 id="related-h" className="h2">{t.relatedTitle}</h2>
          </div>
        </div>
        <ul className="products pdp-rel-list">
          {products.map(p => <ProductTile key={p.id} p={p} />)}
        </ul>
      </div>
    </section>
  )
}

function ProductSkeleton() {
  const { t } = useStore()
  return (
    <section className="pdp" aria-busy="true" aria-label={t.loadingProduct}>
      <div className="wrap pdp-wrap">
        <div className="sk" style={{ height: 14, width: 220, marginBlockEnd: 24 }} />
        <div className="pdp-grid">
          <div className="pdp-gallery"><div className="pdp-stage sk" /></div>
          <div className="pdp-info">
            <div className="sk" style={{ height: 34, width: '85%' }} />
            <div className="sk" style={{ height: 34, width: '55%', marginBlockStart: 10 }} />
            <div className="sk" style={{ height: 30, width: 140, marginBlockStart: 24 }} />
            <div className="sk" style={{ height: 16, width: 90, marginBlockStart: 14 }} />
            <div className="sk" style={{ height: 56, width: '100%', marginBlockStart: 32, borderRadius: 999 }} />
            <div className="sk" style={{ height: 56, width: '100%', marginBlockStart: 12, borderRadius: 999 }} />
          </div>
        </div>
      </div>
    </section>
  )
}
