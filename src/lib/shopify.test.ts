// src/lib/shopify.ts uses the live Storefront API when configured, and fails clearly when not (no sample data).
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.restoreAllMocks() })

async function load(env: Record<string, string | boolean>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  return import('./shopify')
}

describe('Shopify configuration', () => {
  it('is configured when the domain and public token are set', async () => {
    const m = await load({ VITE_SHOPIFY_DOMAIN: 'bahr.myshopify.com', VITE_SHOPIFY_STOREFRONT_TOKEN: 't' })
    expect(m.isConfigured).toBe(true)
  })
  for (const mode of [{ DEV: true, PROD: false }, { DEV: false, PROD: true }]) {
    it(`without settings every call fails with ShopifyConfigError (${mode.DEV ? 'development' : 'production'})`, async () => {
      const m = await load({ VITE_SHOPIFY_DOMAIN: '', VITE_SHOPIFY_STOREFRONT_TOKEN: '', ...mode })
      expect(m.isConfigured).toBe(false)
      await expect(m.getProducts('en')).rejects.toBeInstanceOf(m.ShopifyConfigError)
      await expect(m.getCollection('car-accessories', 'en')).rejects.toBeInstanceOf(m.ShopifyConfigError)
      await expect(m.createCart('en')).rejects.toBeInstanceOf(m.ShopifyConfigError)
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Shopify is not configured'))
    })
  }
})
