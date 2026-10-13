// Shopify Storefront API (GraphQL) client, used through src/lib/shopify.ts.
// https://shopify.dev/docs/api/storefront
//
// The public Storefront access token is designed to ship to the browser; it can only read published catalog
// data and manage carts. Never put an Admin API token in a VITE_ variable.
import type { Cart, Collection, Image, Lang, Policy, PolicyKind, Product, ProductVariant } from './types'

export interface StorefrontConfig {
  /** Store domain, e.g. "bahr.myshopify.com" (no protocol). */
  domain: string
  /** Public Storefront API access token. */
  token: string
  /** Storefront API version, e.g. "2026-07". */
  apiVersion: string
  /** Country used for prices and availability (@inContext). */
  country: string
  fetch?: typeof fetch
  timeoutMs?: number
}

/** A GraphQL, HTTP or network failure talking to Shopify. */
export class StorefrontError extends Error {
  readonly status?: number
  readonly retryable: boolean
  constructor(message: string, opts: { status?: number; retryable?: boolean } = {}) {
    super(message)
    this.name = 'StorefrontError'
    this.status = opts.status
    this.retryable = opts.retryable ?? false
  }
}

/** A cart mutation that Shopify rejected (cart userErrors), e.g. an unavailable variant or a missing cart. */
export class CartUserError extends Error {
  readonly errors: { field?: string[] | null; message: string; code?: string | null }[]
  constructor(errors: CartUserError['errors']) {
    super(errors.map(e => e.message).join('; ') || 'Cart update rejected')
    this.name = 'CartUserError'
    this.errors = errors
  }
}

const LANGUAGE: Record<Lang, string> = { en: 'EN', ar: 'AR' }
const PRODUCTS_PAGE = 100
/** Upper bound on catalog size loaded for client-side collections/search; see the audit notes in README. */
const MAX_PRODUCTS = 1000
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/* ---------- GraphQL documents ---------- */

const IMAGE = 'url altText width height'
const MONEY = 'amount currencyCode'
// quantityAvailable is left out: it needs the unauthenticated_read_product_inventory scope, and asking for it
// without that scope fails the whole query. Add it here once the token has the scope.
const VARIANT = `id title availableForSale sku price { ${MONEY} } compareAtPrice { ${MONEY} } selectedOptions { name value } image { ${IMAGE} }`
const PRODUCT = `
  id handle title description availableForSale vendor productType tags
  featuredImage { ${IMAGE} }
  images(first: 20) { nodes { ${IMAGE} } }
  options { id name optionValues { id name } }
  priceRange { minVariantPrice { ${MONEY} } maxVariantPrice { ${MONEY} } }
  compareAtPriceRange { minVariantPrice { ${MONEY} } maxVariantPrice { ${MONEY} } }
  variants(first: 100) { nodes { ${VARIANT} } }
  collections(first: 10) { nodes { handle } }`
const CART = `
  id checkoutUrl totalQuantity
  cost { subtotalAmount { ${MONEY} } totalAmount { ${MONEY} } }
  lines(first: 100) { nodes {
    id quantity
    cost { totalAmount { ${MONEY} } }
    merchandise { ... on ProductVariant { ${VARIANT} product { id handle title productType featuredImage { ${IMAGE} } } } }
  } }`
const USER_ERRORS = 'userErrors { field message code }'
const CTX = '@inContext(language: $language, country: $country)'
const CTX_VARS = '$language: LanguageCode, $country: CountryCode'

const Q_PRODUCTS = `query Products($first: Int!, $after: String, ${CTX_VARS}) ${CTX} {
  products(first: $first, after: $after, sortKey: BEST_SELLING) { nodes { ${PRODUCT} } pageInfo { hasNextPage endCursor } }
}`
const Q_PRODUCT = `query Product($handle: String!, ${CTX_VARS}) ${CTX} { product(handle: $handle) { ${PRODUCT} } }`
const Q_COLLECTION = `query Collection($handle: String!, $first: Int!, $after: String, ${CTX_VARS}) ${CTX} {
  collection(handle: $handle) {
    id handle title description image { ${IMAGE} }
    products(first: $first, after: $after) { nodes { ${PRODUCT} } pageInfo { hasNextPage endCursor } }
  }
}`
const Q_RECOMMENDATIONS = `query Recommendations($productId: ID!, ${CTX_VARS}) ${CTX} {
  productRecommendations(productId: $productId, intent: RELATED) { ${PRODUCT} }
}`
const POLICY_FIELD: Record<PolicyKind, string> = {
  shipping: 'shippingPolicy', refund: 'refundPolicy', privacy: 'privacyPolicy', terms: 'termsOfService',
}
const qPolicy = (kind: PolicyKind) =>
  `query Policy(${CTX_VARS}) ${CTX} { shop { ${POLICY_FIELD[kind]} { id handle title body url } } }`
const Q_CART = `query Cart($id: ID!, ${CTX_VARS}) ${CTX} { cart(id: $id) { ${CART} } }`
const M_CART_CREATE = `mutation CartCreate($input: CartInput!, ${CTX_VARS}) ${CTX} {
  cartCreate(input: $input) { cart { ${CART} } ${USER_ERRORS} }
}`
const M_LINES_ADD = `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, ${CTX_VARS}) ${CTX} {
  cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART} } ${USER_ERRORS} }
}`
const M_LINES_UPDATE = `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, ${CTX_VARS}) ${CTX} {
  cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART} } ${USER_ERRORS} }
}`
const M_LINES_REMOVE = `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, ${CTX_VARS}) ${CTX} {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART} } ${USER_ERRORS} }
}`

/* ---------- response shapes and mapping ---------- */

type RawProduct = Omit<Product, 'images' | 'variants'> & { images: { nodes: Image[] }; variants: { nodes: (Omit<ProductVariant, 'quantityAvailable'> & { quantityAvailable?: number | null })[] } }
type RawCart = Cart
type MutationResult = { cart: RawCart | null; userErrors: CartUserError['errors'] }

/** Normalises a Storefront product into the app's Product type (fields the query leaves out get safe defaults). */
export function mapProduct(p: RawProduct): Product {
  return {
    ...p,
    description: p.description ?? '',
    vendor: p.vendor ?? '',
    productType: p.productType ?? '',
    tags: p.tags ?? [],
    images: { nodes: p.images?.nodes ?? (p.featuredImage ? [p.featuredImage] : []) },
    options: p.options ?? [],
    collections: { nodes: p.collections?.nodes ?? [] },
    variants: { nodes: (p.variants?.nodes ?? []).map(v => ({ ...v, sku: v.sku || null, quantityAvailable: v.quantityAvailable ?? null })) },
  }
}

export function mapCart(c: RawCart): Cart {
  return {
    ...c,
    lines: {
      nodes: c.lines.nodes
        // A line whose merchandise is no longer a purchasable variant comes back without fields; drop it.
        .filter(l => l.merchandise && 'id' in l.merchandise)
        .map(l => ({ ...l, merchandise: { ...l.merchandise, sku: l.merchandise.sku || null, quantityAvailable: null } })),
    },
  }
}

/* ---------- client ---------- */

export function createStorefrontClient(cfg: StorefrontConfig) {
  const endpoint = `https://${cfg.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/api/${cfg.apiVersion}/graphql.json`
  const doFetch = cfg.fetch ?? fetch.bind(globalThis)
  const timeoutMs = cfg.timeoutMs ?? 12000

  async function once<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    let res: Response
    try {
      res = await doFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Storefront-Access-Token': cfg.token },
        body: JSON.stringify({ query, variables }),
        signal: ctrl.signal,
      })
    } catch {
      throw new StorefrontError(ctrl.signal.aborted ? 'Shopify request timed out' : 'Network error reaching Shopify', { retryable: true })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) {
      throw new StorefrontError(`Shopify responded ${res.status}`, { status: res.status, retryable: res.status === 429 || res.status >= 500 })
    }
    let body: { data?: T; errors?: { message: string; extensions?: { code?: string } }[] }
    try { body = await res.json() } catch { throw new StorefrontError('Shopify returned invalid JSON', { status: res.status }) }
    if (body.errors?.length) {
      const throttled = body.errors.some(e => e.extensions?.code === 'THROTTLED')
      throw new StorefrontError(body.errors.map(e => e.message).join('; '), { status: res.status, retryable: throttled })
    }
    if (!body.data) throw new StorefrontError('Shopify returned no data', { status: res.status })
    return body.data
  }

  /** Reads retry twice with backoff on throttling, 5xx and network errors. Mutations never retry (not idempotent). */
  async function request<T>(query: string, variables: Record<string, unknown>, lang: Lang, retry: boolean): Promise<T> {
    const vars = { ...variables, language: LANGUAGE[lang], country: cfg.country }
    for (let attempt = 0; ; attempt++) {
      try {
        return await once<T>(query, vars)
      } catch (e) {
        if (!retry || attempt >= 2 || !(e instanceof StorefrontError) || !e.retryable) throw e
        await sleep(400 * 2 ** attempt)
      }
    }
  }
  const read = <T>(q: string, v: Record<string, unknown>, lang: Lang) => request<T>(q, v, lang, true)

  async function mutateCart(q: string, v: Record<string, unknown>, lang: Lang, key: string): Promise<Cart> {
    const data = await request<Record<string, MutationResult>>(q, v, lang, false)
    const r = data[key]
    if (r.userErrors?.length) throw new CartUserError(r.userErrors)
    if (!r.cart) throw new CartUserError([{ message: 'Cart not returned' }])
    return mapCart(r.cart)
  }

  return {
    endpoint,

    async getProducts(lang: Lang): Promise<Product[]> {
      const out: Product[] = []
      let after: string | null = null
      do {
        const data: { products: { nodes: RawProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } =
          await read(Q_PRODUCTS, { first: PRODUCTS_PAGE, after }, lang)
        out.push(...data.products.nodes.map(mapProduct))
        after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null
      } while (after && out.length < MAX_PRODUCTS)
      return out
    },

    async getProduct(handle: string, lang: Lang): Promise<Product | null> {
      const data = await read<{ product: RawProduct | null }>(Q_PRODUCT, { handle }, lang)
      return data.product ? mapProduct(data.product) : null
    },

    /**
     * A Shopify collection with its products in the collection's own sort order (paginated); null if it doesn't exist.
     * `limit` loads only the first `limit` products (e.g. a homepage preview) instead of every page.
     */
    async getCollection(handle: string, lang: Lang, limit?: number): Promise<Collection | null> {
      type Page = { collection: (Omit<Collection, 'products'> & { products: { nodes: RawProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }) | null }
      let after: string | null = null
      let head: Omit<Collection, 'products'> | null = null
      const nodes: Product[] = []
      do {
        const first = limit ? Math.min(PRODUCTS_PAGE, limit - nodes.length) : PRODUCTS_PAGE
        const data: Page = await read(Q_COLLECTION, { handle, first, after }, lang)
        if (!data.collection) return null
        const { products, ...rest } = data.collection
        head ??= { ...rest, description: rest.description ?? '' }
        nodes.push(...products.nodes.map(mapProduct))
        after = products.pageInfo.hasNextPage ? products.pageInfo.endCursor : null
      } while (after && nodes.length < (limit ?? MAX_PRODUCTS))
      return { ...head!, products: { nodes: limit ? nodes.slice(0, limit) : nodes } }
    },

    async getProductRecommendations(productId: string, lang: Lang): Promise<Product[]> {
      const data = await read<{ productRecommendations: RawProduct[] | null }>(Q_RECOMMENDATIONS, { productId }, lang)
      return (data.productRecommendations ?? []).map(mapProduct)
    },

    async getPolicy(kind: PolicyKind, lang: Lang): Promise<Policy | null> {
      const data = await read<{ shop: Record<string, Policy | null> }>(qPolicy(kind), {}, lang)
      return data.shop[POLICY_FIELD[kind]] ?? null
    },

    /** Null when the cart has expired or doesn't exist (including stale IDs an old development build saved). */
    async getCart(cartId: string, lang: Lang): Promise<Cart | null> {
      if (!cartId.startsWith('gid://shopify/Cart/') || cartId.includes('/mock-')) return null
      const data = await read<{ cart: RawCart | null }>(Q_CART, { id: cartId }, lang)
      return data.cart ? mapCart(data.cart) : null
    },

    createCart(lang: Lang, lines: { merchandiseId: string; quantity: number }[] = []): Promise<Cart> {
      return mutateCart(M_CART_CREATE, { input: { lines, buyerIdentity: { countryCode: cfg.country } } }, lang, 'cartCreate')
    },
    addCartLine(cartId: string, merchandiseId: string, quantity: number, lang: Lang): Promise<Cart> {
      return mutateCart(M_LINES_ADD, { cartId, lines: [{ merchandiseId, quantity }] }, lang, 'cartLinesAdd')
    },
    /** A quantity of 0 removes the line, as cartLinesUpdate does. */
    updateCartLine(cartId: string, lineId: string, quantity: number, lang: Lang): Promise<Cart> {
      return mutateCart(M_LINES_UPDATE, { cartId, lines: [{ id: lineId, quantity }] }, lang, 'cartLinesUpdate')
    },
    removeCartLine(cartId: string, lineId: string, lang: Lang): Promise<Cart> {
      return mutateCart(M_LINES_REMOVE, { cartId, lineIds: [lineId] }, lang, 'cartLinesRemove')
    },
  }
}

export type StorefrontClient = ReturnType<typeof createStorefrontClient>
