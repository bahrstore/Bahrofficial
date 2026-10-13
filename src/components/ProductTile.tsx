import type { ReactNode } from 'react'
import { compareAtPrice, hasOnlyDefaultVariant, productCategory, productPrice } from '../lib/product'
import type { Product } from '../lib/types'
import { useStore } from '../store'
import { BagIcon, HeartIcon } from './Icons'

/**
 * Splits a formatted price so the currency and decimals can be raised, e.g. "BHD 30.000" → "BHD" + "30" + ".000",
 * and "٣٠٫٠٠٠ د.ب." → "٣٠" + "٫٠٠٠" + "د.ب.". Falls back to the whole string when it doesn't parse.
 */
function PriceText({ text }: { text: string }): ReactNode {
  // Currency (non-digits) before and/or after; the decimals are the last "." or "٫" followed by digits.
  const m = text.match(/^([^\d٠-٩]*)(.*?)([.٫][\d٠-٩]+)?([^\d٠-٩]*)$/)
  if (!m || !/[\d٠-٩]$/.test(m[2])) return text
  const [, pre, whole, dec, post] = m
  // Bidi marks (Arabic output) are kept but don't count as a currency on their own.
  const cur = (s: string) => {
    const [, lead, sym, trail] = s.match(/^(\s*)(.*?)(\s*)$/)!
    return s.replace(/[\s\u200e\u200f\u061c]/g, '') ? <>{lead}<sup>{sym}</sup>{trail}</> : s
  }
  return <>{cur(pre)}{whole}{dec && <sup>{dec}</sup>}{cur(post)}</>
}

/** Product card used on the home page, collection pages and "You may also like". */
export function ProductTile({ p, eager = false }: { p: Product; eager?: boolean }) {
  const { t, money, catLabel, wish, justAdded, addToCart, toggleWish, route } = useStore()
  const href = '/products/' + p.handle
  const open = route(href)
  const img = p.featuredImage
  const wished = !!wish[p.id]
  const just = !!justAdded[p.id]
  const compare = compareAtPrice(p)
  const category = productCategory(p)
  // One short line under the name: the product's own description, else its category or type.
  const blurb = p.description.split('\n')[0].trim() || (category ? catLabel(category) : p.productType)
  // Products with options are chosen on their own page rather than adding an arbitrary variant.
  const choose = p.availableForSale && !hasOnlyDefaultVariant(p)

  return (
    <li className="tile" onClick={(e) => { if (!(e.target as Element).closest('a,button')) open(e) }}>
      <div className="tile-media">
        <a href={href} onClick={open} aria-label={p.title} tabIndex={-1}>
          {img
            ? <img src={img.url} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
            : <span className="tile-noimg"><BagIcon size={24} /><span>{t.noImage}</span></span>}
        </a>
        <button type="button" className="tile-wish" onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={`${wished ? t.wishOn : t.wishOff}: ${p.title}`}>
          <HeartIcon size={16} />
        </button>
      </div>

      <div className="tile-row">
        <a href={href} onClick={open} className="tile-name">{p.title}</a>
        <span className="tile-price">
          <span className="now"><PriceText text={money(productPrice(p))} /></span>
          {compare && <s><PriceText text={money(compare)} /></s>}
        </span>
      </div>
      {blurb && <p className="tile-blurb">{blurb}</p>}

      {choose ? (
        <a href={href} onClick={open} className="tile-btn">{t.chooseOptions}</a>
      ) : (
        <button type="button" className={'tile-btn' + (just ? ' just' : '')} onClick={() => addToCart(p)} disabled={!p.availableForSale}>
          {!p.availableForSale ? t.soldOut : just ? `${t.added} ✓` : t.add}
        </button>
      )}
    </li>
  )
}
