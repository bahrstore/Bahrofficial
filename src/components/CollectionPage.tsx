import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { COLLECTIONS, PRICE_BUCKETS, SORTS, type PriceKey, type Sort } from '../data'
import { amount, compareAtPrice, productCategory, productPrice, type Category } from '../lib/product'
import type { Product } from '../lib/types'
import { useCollection } from '../lib/useShopify'
import { useStore } from '../store'
import { useIsDesktop, useIsMobile } from '../useMedia'
import { GlideSelect } from './GlideSelect'
import { CloseIcon, FilterIcon } from './Icons'
import { ProductTile } from './ProductTile'
import { NotFound } from './NotFound'

type PreviewState = 'live' | 'loading' | 'error' | 'empty'
const PREVIEW_STATES: PreviewState[] = ['live', 'loading', 'error', 'empty']
const CATS: Category[] = ['car', 'mobile']

interface Option { label: string; count: number; checked: boolean; onToggle: () => void }
interface Group { id: string; title: string; options: Option[] }

const list = (v: string | null) => (v || '').split(',').filter(Boolean)

export function CollectionPage({ slug }: { slug: string }) {
  const { t, lang, num, catLabel, panel, setPanel, route } = useStore()
  const isDesktop = useIsDesktop()
  const isMobile = useIsMobile()
  const cfg = COLLECTIONS[slug]
  const cs = t.cols[cfg.key]

  // Filters live in the URL so a filtered view can be shared or reloaded.
  const [params, setParams] = useSearchParams()
  const sortParam = params.get('sort') as Sort
  const sort: Sort = SORTS.includes(sortParam) ? sortParam : 'featured'
  const stock = params.get('stock') === '1'
  const offer = params.get('offer') === '1'
  const price = list(params.get('price')).filter((k): k is PriceKey => PRICE_BUCKETS.some(b => b[0] === k))
  const cats = list(params.get('cat')).filter((k): k is Category => CATS.includes(k as Category))
  const q = (params.get('q') || '').trim()

  const update = (patch: Record<string, string | string[] | boolean | null>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        const s = Array.isArray(v) ? v.join(',') : v === true ? '1' : v || ''
        if (s && !(k === 'sort' && s === 'featured')) next.set(k, s); else next.delete(k)
      }
      return next
    }, { replace: true })
  }
  const toggleIn = <T extends string>(key: string, arr: T[], v: T) => update({ [key]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] })
  const clearAll = () => update({ cat: null, price: null, stock: null, offer: null, q: null })

  // Dev-only: ?preview=loading|error|empty shows the other page states.
  const previewParam = params.get('preview') as PreviewState
  const preview: PreviewState = import.meta.env.DEV && PREVIEW_STATES.includes(previewParam) ? previewParam : 'live'

  const query = useCollection(slug, lang)
  const loading = preview === 'loading' || (preview !== 'error' && query.loading)
  const error = !loading && (preview === 'error' || !!query.error)
  const retry = () => (preview === 'error' ? update({ preview: null }) : query.reload())

  // Shopify has no collection with this handle (deleted, or not created yet).
  const notFound = preview === 'live' && query.data === null

  useEffect(() => {
    if (notFound) return
    document.title = `${cs.label} — Bahr`
    document.querySelector('meta[name="description"]')?.setAttribute('content', cs.meta)
  }, [cs, notFound])

  const base = useMemo(() => (preview === 'empty' || !query.data ? [] : query.data.products.nodes), [preview, query.data])
  const ql = q.toLowerCase()
  const pass = (p: Product, skip?: string) =>
    (skip === 'q' || !ql || p.title.toLowerCase().includes(ql)) &&
    (skip === 'stock' || !stock || p.availableForSale) &&
    (skip === 'price' || !price.length || price.some(k => PRICE_BUCKETS.find(b => b[0] === k)![1](amount(productPrice(p))))) &&
    (skip === 'offer' || !offer || !!compareAtPrice(p)) &&
    (skip === 'cat' || !cats.length || cats.some(c => c === productCategory(p)))

  const products = base.filter(p => pass(p))
  const priceOf = (p: Product) => amount(productPrice(p))
  if (sort === 'price-asc') products.sort((a, b) => priceOf(a) - priceOf(b))
  if (sort === 'price-desc') products.sort((a, b) => priceOf(b) - priceOf(a))

  // Facets only appear when the collection's data makes them meaningful.
  const opt = (label: string, skip: string, test: (p: Product) => boolean, checked: boolean, onToggle: () => void): Option =>
    ({ label, count: base.filter(p => pass(p, skip) && test(p)).length, checked, onToggle })
  const groups: Group[] = []
  const catsIn = CATS.filter(c => base.some(p => productCategory(p) === c))
  if (catsIn.length > 1) groups.push({ id: 'cat', title: t.gCat, options: catsIn.map(c => opt(catLabel(c), 'cat', p => productCategory(p) === c, cats.includes(c), () => toggleIn('cat', cats, c))) })
  const buckets = PRICE_BUCKETS.filter(([, f]) => base.some(p => f(priceOf(p))))
  if (buckets.length > 1) groups.push({ id: 'price', title: t.gPrice, options: buckets.map(([k, f]) => opt(t.priceL[k], 'price', p => f(priceOf(p)), price.includes(k), () => toggleIn('price', price, k))) })
  if (base.some(p => !p.availableForSale)) groups.push({ id: 'stock', title: t.gStock, options: [opt(t.inStock, 'stock', p => p.availableForSale, stock, () => update({ stock: !stock }))] })
  if (base.some(p => compareAtPrice(p))) groups.push({ id: 'offer', title: t.gOffer, options: [opt(t.onOffer, 'offer', p => !!compareAtPrice(p), offer, () => update({ offer: !offer }))] })

  const chips: { label: string; remove: () => void }[] = [
    ...cats.map(c => ({ label: catLabel(c), remove: () => toggleIn('cat', cats, c) })),
    ...price.map(k => ({ label: t.priceL[k], remove: () => toggleIn('price', price, k) })),
    ...(stock ? [{ label: t.inStock, remove: () => update({ stock: null }) }] : []),
    ...(offer ? [{ label: t.onOffer, remove: () => update({ offer: null }) }] : []),
    ...(q ? [{ label: t.searchChip(q), remove: () => update({ q: null }) }] : []),
  ]
  const activeCount = chips.length

  // Roughly how many cards fit in a row (the grid itself is CSS auto-fill); used for skeletons and eager images.
  const cols = isMobile ? 2 : isDesktop ? 5 : 3
  const ready = !loading && !error
  const isEmpty = ready && base.length === 0
  const noRes = ready && base.length > 0 && products.length === 0
  const showSidebar = isDesktop && !error && groups.length > 0
  const filtersOpen = panel === 'filters' && !isDesktop

  const countText = loading || error ? '' : activeCount ? t.countOf(num(products.length), num(base.length)) : t.count(num(base.length))

  let state: { kind: 'error' | 'empty' | 'nores'; title: string; text: string; primary: string; onPrimary: (e?: MouseEvent) => void; secondary: boolean } | null = null
  if (error) state = { kind: 'error', title: t.errTitle, text: t.errText, primary: t.retry, onPrimary: retry, secondary: true }
  else if (isEmpty) {
    const trending = cfg.key === 'trending'
    state = { kind: 'empty', title: t.emptyTitle, text: t.emptyText, primary: trending ? t.backHome : t.browseOther, onPrimary: route(trending ? '/' : '/collections/trending'), secondary: !trending }
  } else if (noRes) state = { kind: 'nores', title: t.noResTitle, text: t.noResText, primary: t.clearAll, onPrimary: clearAll, secondary: false }

  if (notFound) return <NotFound />

  return (
    <section aria-labelledby="grid-h" className="plp">
      <div className="wrap plp-wrap">
        <div className="plp-head">
          <div className="plp-title">
            <h1 id="grid-h">{cs.label}</h1>
            <p aria-live="polite" className="plp-count">{countText}</p>
            {cfg.key === 'trending' && <p className="plp-note"><span className="diamond" />{t.trendNote}</p>}
          </div>
          {!error && base.length > 0 && (
            <div className="plp-tools">
              <GlideSelect
                className="sort-select"
                options={SORTS.map((v, i) => ({ value: v, label: t.sorts[i] }))}
                value={sort}
                onChange={(v) => update({ sort: v })}
                ariaLabel={t.sortBy}
                showTags={false}
                size="lg"
                radius={16}
                menuWidth={232}
                align={isMobile ? 'start' : 'end'}
              />
              {!isDesktop && groups.length > 0 && (
                <button type="button" className="filter-btn" onClick={() => setPanel('filters')} aria-haspopup="dialog" aria-expanded={filtersOpen}>
                  <FilterIcon />
                  {t.filtersTitle}
                  {activeCount > 0 && <span className="filter-count">{num(activeCount)}</span>}
                </button>
              )}
            </div>
          )}
        </div>

        {activeCount > 0 && ready && (
          <div className="chips">
            {chips.map(c => (
              <button key={c.label} type="button" className="chip-btn" onClick={c.remove} aria-label={t.removeFilter(c.label)}>
                {c.label}<CloseIcon size={14} strokeWidth={1.8} />
              </button>
            ))}
            <button type="button" className="link-btn" onClick={clearAll}>{t.clearAll}</button>
          </div>
        )}

        <div className={'plp-layout' + (showSidebar ? ' with-side' : '')}>
          {showSidebar && (
            <aside aria-label={t.filtersTitle} className="plp-side">
              <div className="plp-side-head">
                <h2>{t.filtersTitle}</h2>
                {activeCount > 0 && <button type="button" className="link-btn" onClick={clearAll}>{t.clearAll}</button>}
              </div>
              <FilterGroups groups={groups} />
            </aside>
          )}

          <div className="plp-main">
            {loading && (
              <ul aria-busy="true" aria-label={t.loading} className="plp-grid">
                {Array.from({ length: Math.max(base.length, cols) }, (_, i) => (
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
                  {state.secondary && <a href="/" onClick={route('/')} className="btn btn-outline">{t.backHome}</a>}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {filtersOpen && (
        <FilterSheet
          groups={groups} sort={sort} onSort={(v) => update({ sort: v })} activeCount={activeCount}
          resultCount={products.length} onClear={clearAll} onClose={() => setPanel('none')}
        />
      )}
    </section>
  )
}

function FilterGroups({ groups }: { groups: Group[] }) {
  const { num } = useStore()
  return groups.map(g => (
    <fieldset key={g.id} className="fgroup">
      <legend>{g.title}</legend>
      {g.options.map(o => {
        const off = !o.checked && o.count === 0
        return (
          <label key={o.label} className={'fopt' + (off ? ' off' : '')}>
            <input type="checkbox" checked={o.checked} disabled={off} onChange={o.onToggle} />
            <span className="fopt-label">{o.label}</span>
            <span className="fopt-count">{num(o.count)}</span>
          </label>
        )
      })}
    </fieldset>
  ))
}


/**
 * Mobile filter sheet: slides up over a blurred backdrop, can be dragged down to dismiss, and puts sort,
 * multi-value facets (as chips) and yes/no facets (as switches) in one place. Changes apply as you go, and
 * the footer shows the live result count.
 */
function FilterSheet({ groups, sort, onSort, activeCount, resultCount, onClear, onClose }: {
  groups: Group[]
  sort: Sort
  onSort: (s: Sort) => void
  activeCount: number
  resultCount: number
  onClear: () => void
  onClose: () => void
}) {
  const { t, num } = useStore()
  const sheet = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const [closing, setClosing] = useState(false)

  // Focus moves into the sheet, and back to whatever opened it when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeBtn.current?.focus({ preventScroll: true })
    return () => opener?.focus?.({ preventScroll: true })
  }, [])

  const close = () => {
    if (closing) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { onClose(); return }
    setClosing(true)
    window.setTimeout(onClose, 220)
  }

  // Drag the handle or header down to dismiss.
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest('button')) return
    drag.current = { y: e.clientY, dy: 0 }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d || !sheet.current) return
    d.dy = Math.max(0, e.clientY - d.y)
    sheet.current.style.transition = 'none'
    sheet.current.style.transform = `translateY(${d.dy}px)`
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || !sheet.current) return
    sheet.current.style.transition = ''
    sheet.current.style.transform = ''
    if (d.dy > 90) close()
  }

  const chipGroups = groups.filter(g => g.options.length > 1)
  const switches = groups.filter(g => g.options.length === 1)

  return (
    <div className={'overlay fs-overlay' + (closing ? ' closing' : '')}>
      <div className="fs-backdrop" onClick={close} />
      <div ref={sheet} role="dialog" aria-modal="true" aria-labelledby="fs-title" className="fs-sheet">
        <div className="fs-drag" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="fs-grip"><span /></div>
          <div className="fs-head">
            <div>
              <h2 id="fs-title">{t.filtersTitle}</h2>
              <p aria-live="polite">{activeCount ? t.activeFilters(num(activeCount)) : t.count(num(resultCount))}</p>
            </div>
            <button ref={closeBtn} type="button" className="fs-close" onClick={close} aria-label={t.close}><CloseIcon size={18} /></button>
          </div>
        </div>

        <div className="fs-body">
          <fieldset className="fs-section">
            <legend>{t.sortBy}</legend>
            <div className="fs-chips">
              {SORTS.map((v, i) => (
                <label key={v} className="fs-chip">
                  <input type="radio" name="fs-sort" className="sr-only" checked={sort === v} onChange={() => onSort(v)} />
                  <span>{t.sorts[i]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {chipGroups.map(g => (
            <fieldset key={g.id} className="fs-section">
              <legend>{g.title}</legend>
              <div className="fs-chips">
                {g.options.map(o => {
                  const off = !o.checked && o.count === 0
                  return (
                    <label key={o.label} className={'fs-chip' + (off ? ' off' : '')}>
                      <input type="checkbox" className="sr-only" checked={o.checked} disabled={off} onChange={o.onToggle} />
                      <span>{o.label}</span>
                      <span className="n">{num(o.count)}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}

          {switches.length > 0 && (
            <div className="fs-section fs-switches">
              {switches.map(g => {
                const o = g.options[0]
                const off = !o.checked && o.count === 0
                return (
                  <label key={g.id} className={'fs-switch' + (off ? ' off' : '')}>
                    <span className="txt">
                      <span className="k">{g.title}</span>
                      <span className="v">{o.label} · {num(o.count)}</span>
                    </span>
                    <input type="checkbox" role="switch" className="sr-only" checked={o.checked} disabled={off} onChange={o.onToggle} />
                    <span aria-hidden="true" className="track"><span className="thumb" /></span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="fs-foot">
          <button type="button" className="fs-clear" onClick={onClear} disabled={activeCount === 0}>{t.clearAll}</button>
          <button type="button" className="btn btn-solid fs-apply" onClick={close}>{t.showResults(num(resultCount))}</button>
        </div>
      </div>
    </div>
  )
}
