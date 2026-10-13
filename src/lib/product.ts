// App-level readings of Storefront product fields. Category and the Trending badge come from the product's
// Shopify collections (the same source as the collection pages); the New badge from the "new" tag.
import { COLLECTIONS } from '../data'
import type { Image, Money, Product, ProductVariant } from './types'

export type Category = 'car' | 'mobile'
export type Badge = 'new' | 'sale' | 'trending'

export const amount = (m: Money) => Number(m.amount)

export const productPrice = (p: Product) => p.priceRange.minVariantPrice

/** The compare-at price when it's above the selling price, otherwise null. */
export function compareAtPrice(p: Product): Money | null {
  const c = p.compareAtPriceRange.minVariantPrice
  return amount(c) > amount(productPrice(p)) ? c : null
}

const inCollection = (p: Product, handle: string) => p.collections.nodes.some(c => c.handle === handle)

/**
 * Car or Mobile when the product is in the car-accessories or mobile-accessories Shopify collection — exactly
 * the products those collection pages show. Null when it's in neither (no category is shown or filtered).
 */
export function productCategory(p: Product): Category | null {
  if (inCollection(p, 'car-accessories')) return 'car'
  if (inCollection(p, 'mobile-accessories')) return 'mobile'
  return null
}

export function productBadge(p: Product): Badge | null {
  if (inCollection(p, 'trending')) return 'trending'
  if (compareAtPrice(p)) return 'sale'
  if (p.tags.includes('new')) return 'new'
  return null
}

/** True when the product has only Shopify's placeholder variant (option Title / Default Title), so there's nothing to choose. */
export const hasOnlyDefaultVariant = (p: Product) =>
  p.variants.nodes.length === 1 && p.variants.nodes[0].selectedOptions.every(o => o.name === 'Title' && o.value === 'Default Title')

/** The variant's compare-at price when it's above the selling price, otherwise null. */
export function variantCompareAt(v: ProductVariant): Money | null {
  return v.compareAtPrice && amount(v.compareAtPrice) > amount(v.price) ? v.compareAtPrice : null
}

/** Whole-percent saving from real prices, e.g. 15 for 8.500 → 7.200. */
export const discountPercent = (price: Money, compareAt: Money) => Math.round((1 - amount(price) / amount(compareAt)) * 100)

/** The first variant that can be bought, or the first variant when none can. */
export const defaultVariant = (p: Product) => p.variants.nodes.find(v => v.availableForSale) ?? p.variants.nodes[0]

/** The product's home collection for breadcrumbs: the first of its Shopify collections that the app has a page for, skipping Trending. */
export function productCollection(p: Product): string | null {
  return p.collections.nodes.find(c => COLLECTIONS[c.handle] && COLLECTIONS[c.handle].key !== 'trending')?.handle ?? null
}

/**
 * The same image at another width. Shopify's CDN takes `width`; the Unsplash placeholders take `w`.
 * Other hosts are returned unchanged.
 */
export function imageUrl(img: Image, width: number): string {
  try {
    const u = new URL(img.url)
    if (u.hostname === 'images.unsplash.com') u.searchParams.set('w', String(width))
    else if (u.hostname === 'cdn.shopify.com' || u.pathname.includes('/cdn/shop/')) u.searchParams.set('width', String(width))
    else return img.url
    return u.toString()
  } catch { return img.url }
}

export const imageSrcSet = (img: Image, widths: number[]) => widths.map(w => `${imageUrl(img, w)} ${w}w`).join(', ')

/**
 * The cart's checkout URL when it's safe to send the shopper there: an absolute https URL from Shopify.
 * Null for anything else (relative, http or script URLs), which the UI refuses to link.
 */
export function checkoutHref(checkoutUrl: string): string | null {
  try {
    const u = new URL(checkoutUrl)
    return u.protocol === 'https:' ? u.toString() : null
  } catch { return null }
}
