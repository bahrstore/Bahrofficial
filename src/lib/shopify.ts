// The only data source for components: the Shopify Storefront API, through ./storefront.
// Every function takes the language, as Storefront queries do with @inContext(language: ...).
//
// There is no mock or sample data. Without VITE_SHOPIFY_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN every call
// fails with ShopifyConfigError, so pages show their error states — in development and production alike.
import { createStorefrontClient, type StorefrontClient } from './storefront'
import type { Cart, Collection, Lang, Policy, PolicyKind, Product } from './types'

const env = import.meta.env
const domain = (env.VITE_SHOPIFY_DOMAIN as string | undefined)?.trim()
const token = (env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined)?.trim()

/** True when the Shopify domain and public Storefront token are set. */
export const isConfigured = !!domain && !!token

export class ShopifyConfigError extends Error {
  constructor() {
    super('Shopify is not configured: set VITE_SHOPIFY_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN in .env, then restart the dev server.')
    this.name = 'ShopifyConfigError'
  }
}

const client: StorefrontClient | null = isConfigured
  ? createStorefrontClient({
      domain: domain!,
      token: token!,
      apiVersion: (env.VITE_SHOPIFY_API_VERSION as string | undefined) || '2026-10',
      country: (env.VITE_SHOPIFY_COUNTRY as string | undefined) || 'BH',
    })
  : null

if (!client) console.error(new ShopifyConfigError().message)

const api = (): StorefrontClient => {
  if (!client) throw new ShopifyConfigError()
  return client
}
// Async wrappers so a missing configuration surfaces as a rejected promise (handled by each page's error state).
const call = async <T>(fn: (c: StorefrontClient) => Promise<T>): Promise<T> => fn(api())

export const getProducts = (lang: Lang): Promise<Product[]> => call(c => c.getProducts(lang))
export const getProduct = (handle: string, lang: Lang): Promise<Product | null> => call(c => c.getProduct(handle, lang))
/** A Shopify collection by handle, with its products; null when the store has no such collection. */
export const getCollection = (handle: string, lang: Lang): Promise<Collection | null> => call(c => c.getCollection(handle, lang))
export const getProductRecommendations = (productId: string, lang: Lang): Promise<Product[]> => call(c => c.getProductRecommendations(productId, lang))
export const getPolicy = (kind: PolicyKind, lang: Lang): Promise<Policy | null> => call(c => c.getPolicy(kind, lang))
/** Resolves to null when the cart no longer exists (Shopify expires carts), so the caller can start a new one. */
export const getCart = (cartId: string, lang: Lang): Promise<Cart | null> => call(c => c.getCart(cartId, lang))
export const createCart = (lang: Lang, lines: { merchandiseId: string; quantity: number }[] = []): Promise<Cart> => call(c => c.createCart(lang, lines))
export const addCartLine = (cartId: string, merchandiseId: string, quantity: number, lang: Lang): Promise<Cart> => call(c => c.addCartLine(cartId, merchandiseId, quantity, lang))
/** A quantity of 0 removes the line, as cartLinesUpdate does. */
export const updateCartLine = (cartId: string, lineId: string, quantity: number, lang: Lang): Promise<Cart> => call(c => c.updateCartLine(cartId, lineId, quantity, lang))
export const removeCartLine = (cartId: string, lineId: string, lang: Lang): Promise<Cart> => call(c => c.removeCartLine(cartId, lineId, lang))
