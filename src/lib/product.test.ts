import { describe, expect, it } from 'vitest'
import { checkoutHref, compareAtPrice, onOffer, defaultVariant, discountPercent, hasOnlyDefaultVariant, imageUrl, productBadge, productCategory, productCollection, variantCompareAt } from './product'
import type { Money, Product, ProductVariant } from './types'

// Minimal Storefront-shaped inputs for these pure helpers (test-only; the app has no sample data).
const bhd = (n: number): Money => ({ amount: n.toFixed(3), currencyCode: 'BHD' })
const variant = (id: string, title: string, price: number, opts: Partial<ProductVariant> = {}): ProductVariant => ({
  id, title, availableForSale: true, sku: null, quantityAvailable: null, price: bhd(price), compareAtPrice: null,
  selectedOptions: [{ name: title === 'Default Title' ? 'Title' : 'Colour', value: title }], image: null, ...opts,
})
const product = (variants: ProductVariant[], extra: Partial<Product> = {}): Product => {
  const prices = variants.map(v => Number(v.price.amount))
  const compares = variants.map(v => Number(v.compareAtPrice?.amount ?? 0))
  return {
    id: 'gid://shopify/Product/1', handle: 'p', title: 'P', description: '', availableForSale: variants.some(v => v.availableForSale),
    vendor: '', productType: '', tags: [], featuredImage: null, images: { nodes: [] }, options: [],
    priceRange: { minVariantPrice: bhd(Math.min(...prices)), maxVariantPrice: bhd(Math.max(...prices)) },
    compareAtPriceRange: { minVariantPrice: bhd(Math.min(...compares)), maxVariantPrice: bhd(Math.max(...compares)) },
    variants: { nodes: variants }, collections: { nodes: [] }, ...extra,
  }
}

describe('pricing', () => {
  it('shows a compare-at price only when it is above the selling price', () => {
    expect(compareAtPrice(product([variant('v', 'Default Title', 7.2, { compareAtPrice: bhd(8.5) })]))?.amount).toBe('8.500')
    expect(compareAtPrice(product([variant('v', 'Default Title', 5.9)]))).toBeNull()
  })
  it('pairs the card price with the compare-at price of the same variant, never another variant’s', () => {
    // Cheapest variant has no compare-at; only the dearer one is discounted.
    const mixed = product([variant('a', 'Small', 5), variant('b', 'Large', 10, { compareAtPrice: bhd(12) })])
    expect(compareAtPrice({ ...mixed, compareAtPriceRange: { minVariantPrice: bhd(12), maxVariantPrice: bhd(12) } })).toBeNull()
    expect(onOffer(mixed)).toBe(true)
    expect(productBadge(mixed)).toBe('sale')
    // Cheapest variant discounted: its own compare-at, not the range minimum from another variant.
    const cheapOnSale = product([variant('a', 'Small', 5, { compareAtPrice: bhd(9) }), variant('b', 'Large', 10, { compareAtPrice: bhd(6) })])
    expect(compareAtPrice(cheapOnSale)?.amount).toBe('9.000')
  })
  it('is not on offer when no variant sells below its compare-at price', () => {
    const p = product([variant('a', 'Small', 5, { compareAtPrice: bhd(5) }), variant('b', 'Large', 10)])
    expect(compareAtPrice(p)).toBeNull()
    expect(onOffer(p)).toBe(false)
    expect(productBadge(p)).toBeNull()
  })
  it('computes the discount from real prices', () => {
    expect(discountPercent(bhd(7.2), bhd(8.5))).toBe(15)
  })
  it('reads variant-level compare-at prices, ignoring ones not above the price', () => {
    expect(variantCompareAt(variant('a', '2 m', 3.4, { compareAtPrice: bhd(3.9) }))?.amount).toBe('3.900')
    expect(variantCompareAt(variant('b', '1 m', 2.4, { compareAtPrice: bhd(2.4) }))).toBeNull()
  })
})

describe('variants', () => {
  it('recognises Shopify’s placeholder variant', () => {
    expect(hasOnlyDefaultVariant(product([variant('v', 'Default Title', 1)]))).toBe(true)
    expect(hasOnlyDefaultVariant(product([variant('a', 'Black', 1), variant('b', 'White', 1)]))).toBe(false)
  })
  it('defaults to the first variant that can be bought', () => {
    const p = product([variant('w', 'White', 1, { availableForSale: false }), variant('b', 'Black', 1)])
    expect(defaultVariant(p).title).toBe('Black')
  })
})

describe('checkoutHref', () => {
  it('accepts https checkout URLs from Shopify', () => {
    expect(checkoutHref('https://bahr.myshopify.com/cart/c/abc?key=1')).toBe('https://bahr.myshopify.com/cart/c/abc?key=1')
  })
  it('refuses relative, http and script URLs', () => {
    for (const u of ['/checkout?cart=1', 'http://bahr.myshopify.com/cart', 'javascript:alert(1)', '']) expect(checkoutHref(u)).toBeNull()
  })
})

describe('misc', () => {
  it('resizes Shopify CDN images with width', () => {
    expect(imageUrl({ url: 'https://cdn.shopify.com/s/files/a.jpg?v=1', altText: null }, 400)).toBe('https://cdn.shopify.com/s/files/a.jpg?v=1&width=400')
  })
  it('places a product in its first app collection (not Trending) for breadcrumbs', () => {
    const p = (handles: string[]) => product([variant('v', 'Default Title', 1)], { collections: { nodes: handles.map(handle => ({ handle })) } })
    expect(productCollection(p(['trending', 'car-accessories']))).toBe('car-accessories')
    expect(productCollection(p(['frontpage']))).toBeNull()
  })
})

describe('category and badges follow Shopify collections', () => {
  const p = (handles: string[], tags: string[] = []) =>
    product([variant('v', 'Default Title', 1)], { tags, collections: { nodes: handles.map(handle => ({ handle })) } })
  it('is Car / Mobile only when the product is in that collection', () => {
    expect(productCategory(p(['car-accessories']))).toBe('car')
    expect(productCategory(p(['mobile-accessories']))).toBe('mobile')
  })
  it('has no category when the product is in neither collection, whatever its tags', () => {
    expect(productCategory(p([], ['phone']))).toBeNull()
    expect(productCategory(p(['frontpage'], ['car']))).toBeNull()
  })
  it('shows the Trending badge for products in the trending collection', () => {
    expect(productBadge(p(['trending']))).toBe('trending')
    expect(productBadge(p([], ['trending']))).toBeNull()
    expect(productBadge(p([], ['new']))).toBe('new')
  })
})
