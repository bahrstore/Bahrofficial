// React hooks over src/lib/shopify.ts. Results are cached per query so components share one request,
// and a cached result renders immediately (no empty frame when switching back to a language).
import { useEffect, useState } from 'react'
import { getCollection, getPolicy, getProduct, getProductRecommendations, getProducts } from './shopify'
import type { Collection, Lang, Policy, PolicyKind, Product } from './types'

const pending = new Map<string, Promise<unknown>>()
const resolved = new Map<string, unknown>()

function useQuery<T>(key: string, fetcher: () => Promise<T>) {
  const [nonce, setNonce] = useState(0)
  const [failed, setFailed] = useState<{ req: string; error: unknown } | null>(null)
  const [, setTick] = useState(0)
  const req = `${key}#${nonce}`

  useEffect(() => {
    if (resolved.has(key)) return
    let live = true
    let p = pending.get(key) as Promise<T> | undefined
    if (!p) {
      p = fetcher()
      pending.set(key, p)
      p.then(data => { resolved.set(key, data) }, () => {}).finally(() => pending.delete(key))
    }
    p.then(() => { if (live) setTick(t => t + 1) }, error => { if (live) setFailed({ req, error }) })
    return () => { live = false }
    // `key` encodes every input of `fetcher`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req])

  const data = resolved.get(key) as T | undefined
  const error = failed?.req === req ? failed.error : null
  return {
    data,
    error,
    loading: data === undefined && !error,
    reload: () => { resolved.delete(key); setNonce(n => n + 1) },
  }
}

export const useProducts = (lang: Lang) => useQuery<Product[]>(`products:${lang}`, () => getProducts(lang))

export const useProduct = (handle: string, lang: Lang) =>
  useQuery<Product | null>(`product:${handle}:${lang}`, () => getProduct(handle, lang))

export const useRecommendations = (productId: string, lang: Lang) =>
  useQuery<Product[]>(`recommendations:${productId}:${lang}`, () => getProductRecommendations(productId, lang))

export const useCollection = (handle: string, lang: Lang, limit?: number) =>
  useQuery<Collection | null>(`collection:${handle}:${lang}${limit ? `:${limit}` : ''}`, () => getCollection(handle, lang, limit))

export const usePolicy = (kind: PolicyKind, lang: Lang) =>
  useQuery<Policy | null>(`policy:${kind}:${lang}`, () => getPolicy(kind, lang))
