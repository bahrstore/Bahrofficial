// Types shaped like the Shopify Storefront API (GraphQL). Field names and nesting match the API so
// src/lib/shopify.ts can later return real query results without changing any component.
// https://shopify.dev/docs/api/storefront

export type Lang = 'en' | 'ar'

/** Storefront `CurrencyCode`. Bahr sells in BHD only. */
export type CurrencyCode = 'BHD' | (string & {})

/** Storefront `MoneyV2`. `amount` is a decimal string, as the API returns it. */
export interface Money {
  amount: string
  currencyCode: CurrencyCode
}

/** Storefront `Image`. */
export interface Image {
  id?: string
  url: string
  altText: string | null
  width?: number
  height?: number
}

/** Storefront connection, queried with `nodes`. */
export interface Connection<T> {
  nodes: T[]
}

export interface SelectedOption {
  name: string
  value: string
}

/** Storefront `ProductOption`. A product without options has one: Title / Default Title. */
export interface ProductOption {
  id?: string
  name: string
  optionValues: { id?: string; name: string }[]
}

/** Storefront `ProductVariant`. */
export interface ProductVariant {
  id: string
  title: string
  availableForSale: boolean
  /** Null when the variant has no SKU, as in the API. */
  sku: string | null
  /** Needs the unauthenticated_read_product_inventory scope; null when stock isn't shared. */
  quantityAvailable: number | null
  price: Money
  compareAtPrice: Money | null
  selectedOptions: SelectedOption[]
  image: Image | null
}

/** Storefront `ProductPriceRange`. */
export interface PriceRange {
  minVariantPrice: Money
  maxVariantPrice: Money
}

/** Storefront `Product`. */
export interface Product {
  id: string
  handle: string
  title: string
  description: string
  availableForSale: boolean
  /** Empty when not set (Shopify otherwise defaults it to the shop name). */
  vendor: string
  productType: string
  tags: string[]
  featuredImage: Image | null
  images: Connection<Image>
  options: ProductOption[]
  priceRange: PriceRange
  /** Amounts are "0.0" when no variant has a compare-at price, as in the API. */
  compareAtPriceRange: PriceRange
  variants: Connection<ProductVariant>
  /** Only the handles, to place the product in one of the app's collection pages. */
  collections: Connection<Pick<Collection, 'handle'>>
}

/** Storefront `Collection`. */
export interface Collection {
  id: string
  handle: string
  title: string
  description: string
  image: Image | null
  products: Connection<Product>
}

/** Storefront `CartLine` (merchandise is always a ProductVariant here). */
export interface CartLine {
  id: string
  quantity: number
  merchandise: ProductVariant & { product: Pick<Product, 'id' | 'handle' | 'title' | 'productType' | 'featuredImage'> }
  cost: { totalAmount: Money }
}

/** Storefront `Cart`. */
export interface Cart {
  id: string
  checkoutUrl: string
  totalQuantity: number
  lines: Connection<CartLine>
  cost: {
    subtotalAmount: Money
    totalAmount: Money
  }
}

/** Storefront `ShopPolicy` (shop.privacyPolicy, refundPolicy, shippingPolicy, termsOfService). `body` is HTML. */
export interface Policy {
  id: string
  handle: string
  title: string
  body: string
  url: string
}

export type PolicyKind = 'shipping' | 'refund' | 'privacy' | 'terms'
