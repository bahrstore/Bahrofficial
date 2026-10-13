import { describe, expect, it, vi } from 'vitest'
import { CartUserError, StorefrontError, createStorefrontClient, mapProduct } from './storefront'

type Call = { url: string; init: RequestInit; body: { query: string; variables: Record<string, unknown> } }

/** A fetch stub that replays the given responses in order and records each call. */
function stubFetch(...responses: (Partial<{ status: number; json: unknown }> | Error)[]) {
  const calls: Call[] = []
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(init.body as string) })
    const r = responses.shift()
    if (!r) throw new Error('unexpected request')
    if (r instanceof Error) throw r
    return new Response(JSON.stringify(r.json ?? {}), { status: r.status ?? 200 })
  })
  return { fetch: fn as unknown as typeof fetch, calls }
}

const client = (f: typeof fetch) =>
  createStorefrontClient({ domain: 'https://bahr.myshopify.com/', token: 'public-token', apiVersion: '2026-07', country: 'BH', fetch: f, timeoutMs: 1000 })

const rawProduct = (n: number) => ({
  id: `gid://shopify/Product/${n}`, handle: `p-${n}`, title: `P${n}`, description: null, availableForSale: true, vendor: null,
  productType: 'cable', tags: ['mobile'], featuredImage: null, images: { nodes: [] }, options: [{ id: 'o', name: 'Title', optionValues: [{ id: 'v', name: 'Default Title' }] }],
  priceRange: { minVariantPrice: { amount: '1.0', currencyCode: 'BHD' }, maxVariantPrice: { amount: '1.0', currencyCode: 'BHD' } },
  compareAtPriceRange: { minVariantPrice: { amount: '0.0', currencyCode: 'BHD' }, maxVariantPrice: { amount: '0.0', currencyCode: 'BHD' } },
  variants: { nodes: [{ id: `gid://shopify/ProductVariant/${n}`, title: 'Default Title', availableForSale: true, sku: '', price: { amount: '1.0', currencyCode: 'BHD' }, compareAtPrice: null, selectedOptions: [{ name: 'Title', value: 'Default Title' }], image: null }] },
})
const rawCart = { id: 'gid://shopify/Cart/abc', checkoutUrl: 'https://bahr.myshopify.com/cart/c/abc', totalQuantity: 0, cost: { subtotalAmount: { amount: '0.0', currencyCode: 'BHD' }, totalAmount: { amount: '0.0', currencyCode: 'BHD' } }, lines: { nodes: [] } }

describe('Storefront client: requests', () => {
  it('posts to the versioned endpoint with the public token and @inContext language/country', async () => {
    const { fetch, calls } = stubFetch({ json: { data: { product: null } } })
    await client(fetch).getProduct('x', 'ar')
    expect(calls[0].url).toBe('https://bahr.myshopify.com/api/2026-07/graphql.json')
    expect((calls[0].init.headers as Record<string, string>)['X-Shopify-Storefront-Access-Token']).toBe('public-token')
    expect(calls[0].body.variables).toMatchObject({ handle: 'x', language: 'AR', country: 'BH' })
    expect(calls[0].body.query).toContain('@inContext(language: $language, country: $country)')
  })

  it('returns null for a missing product (unpublished or deleted)', async () => {
    const { fetch } = stubFetch({ json: { data: { product: null } } })
    expect(await client(fetch).getProduct('gone', 'en')).toBeNull()
  })

  it('follows cursor pagination for the catalogue', async () => {
    const { fetch, calls } = stubFetch(
      { json: { data: { products: { nodes: [rawProduct(1)], pageInfo: { hasNextPage: true, endCursor: 'c1' } } } } },
      { json: { data: { products: { nodes: [rawProduct(2)], pageInfo: { hasNextPage: false, endCursor: null } } } } },
    )
    const products = await client(fetch).getProducts('en')
    expect(products.map(p => p.handle)).toEqual(['p-1', 'p-2'])
    expect(calls[1].body.variables.after).toBe('c1')
  })
})

describe('Storefront client: collections', () => {
  const page = (nodes: unknown[], next: string | null) =>
    ({ json: { data: { collection: { id: 'gid://shopify/Collection/1', handle: 'car-accessories', title: 'Car Accessories', description: null, image: null, products: { nodes, pageInfo: { hasNextPage: !!next, endCursor: next } } } } } })

  it('loads a collection with all its products across pages, in Shopify’s order', async () => {
    const { fetch, calls } = stubFetch(page([rawProduct(2)], 'c1'), page([rawProduct(1)], null))
    const c = await client(fetch).getCollection('car-accessories', 'en')
    expect(c?.title).toBe('Car Accessories')
    expect(c?.description).toBe('')
    expect(c?.products.nodes.map(p => p.handle)).toEqual(['p-2', 'p-1'])
    expect(calls[0].body.variables).toMatchObject({ handle: 'car-accessories', after: null })
    expect(calls[1].body.variables.after).toBe('c1')
  })

  it('returns null for a collection the store does not have', async () => {
    const { fetch } = stubFetch({ json: { data: { collection: null } } })
    expect(await client(fetch).getCollection('nope', 'en')).toBeNull()
  })

  it('maps each product’s collection handles (used for breadcrumbs)', () => {
    const p = mapProduct({ ...rawProduct(1), collections: { nodes: [{ handle: 'car-accessories' }] } } as never)
    expect(p.collections.nodes).toEqual([{ handle: 'car-accessories' }])
    expect(mapProduct(rawProduct(1) as never).collections.nodes).toEqual([])
  })
})

describe('Storefront client: errors', () => {
  it('surfaces GraphQL errors', async () => {
    const { fetch } = stubFetch({ json: { errors: [{ message: 'Field x does not exist' }] } })
    await expect(client(fetch).getProduct('x', 'en')).rejects.toThrow(/Field x does not exist/)
  })

  it('retries reads on 429 / 5xx and then succeeds', async () => {
    vi.useFakeTimers()
    const { fetch, calls } = stubFetch({ status: 429 }, { status: 503 }, { json: { data: { product: null } } })
    const p = client(fetch).getProduct('x', 'en')
    await vi.runAllTimersAsync()
    await expect(p).resolves.toBeNull()
    expect(calls).toHaveLength(3)
    vi.useRealTimers()
  })

  it('does not retry client errors such as 401', async () => {
    const { fetch, calls } = stubFetch({ status: 401 })
    const err = await client(fetch).getProduct('x', 'en').catch(e => e)
    expect(err).toBeInstanceOf(StorefrontError)
    expect(err.status).toBe(401)
    expect(calls).toHaveLength(1)
  })

  it('never retries cart mutations (they are not idempotent)', async () => {
    const { fetch, calls } = stubFetch({ status: 503 })
    await expect(client(fetch).addCartLine('gid://shopify/Cart/abc', 'v', 1, 'en')).rejects.toBeInstanceOf(StorefrontError)
    expect(calls).toHaveLength(1)
  })

  it('turns cart userErrors into CartUserError', async () => {
    const { fetch } = stubFetch({ json: { data: { cartLinesAdd: { cart: null, userErrors: [{ field: ['lines'], message: 'Variant is sold out', code: 'INVALID' }] } } } })
    const err = await client(fetch).addCartLine('gid://shopify/Cart/abc', 'v', 1, 'en').catch(e => e)
    expect(err).toBeInstanceOf(CartUserError)
    expect(err.message).toBe('Variant is sold out')
  })
})

describe('Storefront client: cart', () => {
  it('creates carts with the buyer country so prices match checkout', async () => {
    const { fetch, calls } = stubFetch({ json: { data: { cartCreate: { cart: rawCart, userErrors: [] } } } })
    const cart = await client(fetch).createCart('en', [{ merchandiseId: 'v1', quantity: 2 }])
    expect(calls[0].body.variables.input).toEqual({ lines: [{ merchandiseId: 'v1', quantity: 2 }], buyerIdentity: { countryCode: 'BH' } })
    expect(cart.checkoutUrl).toBe('https://bahr.myshopify.com/cart/c/abc')
  })

  it('sends quantity updates and removals as Shopify expects', async () => {
    const ok = (key: string) => ({ json: { data: { [key]: { cart: rawCart, userErrors: [] } } } })
    const { fetch, calls } = stubFetch(ok('cartLinesUpdate'), ok('cartLinesRemove'))
    const c = client(fetch)
    await c.updateCartLine('gid://shopify/Cart/abc', 'line1', 0, 'en')
    await c.removeCartLine('gid://shopify/Cart/abc', 'line1', 'en')
    expect(calls[0].body.variables.lines).toEqual([{ id: 'line1', quantity: 0 }])
    expect(calls[1].body.variables.lineIds).toEqual(['line1'])
  })

  it('treats expired carts and stale IDs saved by old development builds as missing', async () => {
    const { fetch, calls } = stubFetch({ json: { data: { cart: null } } })
    const c = client(fetch)
    expect(await c.getCart('gid://shopify/Cart/mock-123', 'en')).toBeNull()
    expect(calls).toHaveLength(0)
    expect(await c.getCart('gid://shopify/Cart/expired', 'en')).toBeNull()
  })
})

describe('mapProduct', () => {
  it('fills safe defaults for null fields and normalises empty SKUs', () => {
    const p = mapProduct(rawProduct(1) as never)
    expect(p.description).toBe('')
    expect(p.vendor).toBe('')
    expect(p.variants.nodes[0].sku).toBeNull()
    expect(p.variants.nodes[0].quantityAvailable).toBeNull()
  })
})
