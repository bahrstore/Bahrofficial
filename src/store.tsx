import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COLLECTION_SLUGS, POLICY_SLUGS, T, type Strings } from './data'
import { checkoutHref, defaultVariant, type Category } from './lib/product'
import { addCartLine, createCart, getCart, removeCartLine, updateCartLine } from './lib/shopify'
import type { Cart, Lang, Money, Product } from './lib/types'

const STORE_KEY = 'bahr.store.v1'
const ARABIC_NUMERALS: 'arab' | 'latn' = 'arab'

type Wish = Record<string, true>
type Panel = 'none' | 'menu' | 'cart' | 'search' | 'filters'

interface Store {
  lang: Lang
  ar: boolean
  t: Strings
  arrow: string
  /** Formats a Storefront MoneyV2 with Intl.NumberFormat in its own currency. */
  money: (m: Money) => string
  num: (n: number) => string
  pad: (n: number) => string
  catLabel: (c: Category) => string
  setLang: (l: Lang) => void
  /** The Storefront cart, or null before anything is added. Show its totals; never compute them. */
  cart: Cart | null
  cartCount: number
  /** Quantity of a product across cart lines, for "· 2 in cart" labels. */
  cartQty: (productId: string) => number
  /**
   * Adds a variant (default: the first one that can be bought) to the cart. Resolves to the updated cart,
   * or null when it failed (an error toast has already been shown).
   */
  addToCart: (p: Product, opts?: { variantId?: string; quantity?: number }) => Promise<Cart | null>
  /**
   * Buy now: a separate one-item Shopify cart for just this variant and quantity, leaving the shopping cart
   * untouched. Resolves to its checkout URL, or null when it failed (an error toast has already been shown).
   */
  buyNow: (p: Product, opts: { variantId: string; quantity: number }) => Promise<string | null>
  setLineQty: (lineId: string, q: number) => void
  removeLine: (lineId: string) => void
  justAdded: Record<string, boolean>
  wish: Wish
  toggleWish: (id: string) => void
  toast: string
  panel: Panel
  setPanel: (p: Panel) => void
  /** Click handler for links: navigates to built pages; for pages that aren't built yet, closes panels and explains via toast. */
  route: (path: string) => (e?: MouseEvent) => void
  goHome: (e?: MouseEvent) => void
  scrollToId: (id: string) => (e?: MouseEvent) => void
  scrollTop: (e?: MouseEvent) => void
}

const Ctx = createContext<Store | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

// Keeps only Storefront product IDs; entries saved before the Storefront-shaped data used other IDs.
const gidsOnly = <V,>(o: Record<string, V> | undefined) =>
  Object.fromEntries(Object.entries(o || {}).filter(([id]) => id.startsWith('gid://shopify/Product/')))

// Only the cart ID is stored; the cart itself lives in Shopify.
function load(): { lang?: Lang; cartId?: string; wish?: Wish } {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
    return { lang: s.lang, cartId: typeof s.cartId === 'string' ? s.cartId : undefined, wish: gidsOnly<true>(s.wish) as Wish }
  } catch { return {} }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(load)
  const [lang, setLangState] = useState<Lang>(saved.lang === 'ar' ? 'ar' : 'en')
  const [cartId, setCartId] = useState<string | null>(saved.cartId || null)
  const [cartState, setCartState] = useState<Cart | null>(null)
  const cartIdRef = useRef(cartId)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const [wish, setWish] = useState<Wish>(saved.wish || {})
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')
  const [panel, setPanel] = useState<Panel>('none')
  const toastT = useRef(0)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const ar = lang === 'ar'
  const t = T[lang]
  const cart = cartId && cartState?.id === cartId ? cartState : null

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ lang, cartId, wish })) } catch { /* storage unavailable */ }
  }, [lang, cartId, wish])

  // Load the saved cart, and reload it in the new language so line titles follow the interface.
  useEffect(() => {
    if (!cartId) return
    let live = true
    getCart(cartId, lang).then(c => {
      if (!live) return
      if (c) setCartState(c)
      else { cartIdRef.current = null; setCartId(null) }
    }, () => {})
    return () => { live = false }
  }, [cartId, lang])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = ar ? 'rtl' : 'ltr'
  }, [lang, ar])

  useEffect(() => {
    document.body.style.overflow = panel === 'menu' || panel === 'cart' || panel === 'filters' ? 'hidden' : ''
  }, [panel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel('none') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastT.current)
    setToast(msg)
    toastT.current = window.setTimeout(() => setToast(''), 2800)
  }, [])

  const fmt = useMemo(() => {
    const loc = ar ? (ARABIC_NUMERALS === 'latn' ? 'ar-BH-u-nu-latn' : 'ar-BH') : 'en-BH'
    const currency: Record<string, Intl.NumberFormat> = {}
    const num = new Intl.NumberFormat(loc)
    const pad2 = new Intl.NumberFormat(loc, { minimumIntegerDigits: 2 })
    return {
      // BHD has three minor units, so Intl prints three decimals on its own.
      money: (m: Money) => (currency[m.currencyCode] ??= new Intl.NumberFormat(loc, { style: 'currency', currency: m.currencyCode })).format(Number(m.amount)),
      num: (n: number) => num.format(n),
      pad: (n: number) => pad2.format(n),
    }
  }, [ar])

  const value = useMemo<Store>(() => {
    // Cart calls run one at a time, so quick taps can't race each other or create two carts.
    const run = (op: (id: string | null) => Promise<Cart>, onDone?: () => void): Promise<Cart | null> => {
      const done = queue.current.then(() => op(cartIdRef.current)).then(c => {
        cartIdRef.current = c.id
        setCartId(c.id)
        setCartState(c)
        onDone?.()
        return c
      }, () => {
        showToast(t.cartError)
        // Re-sync with Shopify so the drawer never shows a stale or expired cart after a failed update.
        const id = cartIdRef.current
        if (id) getCart(id, lang).then(c => {
          if (c) setCartState(c)
          else { cartIdRef.current = null; setCartId(null) }
        }, () => {})
        return null
      })
      queue.current = done
      return done
    }
    return {
      lang, ar, t, arrow: ar ? '←' : '→', ...fmt,
      catLabel: (c) => (c === 'car' ? t.catCar : t.catMobile),
      setLang: (l) => { setLangState(l); setPanel('none') },
      cart, cartCount: cart?.totalQuantity ?? 0, justAdded, wish, toast, panel, setPanel,
      cartQty: (productId) => cart?.lines.nodes.filter(l => l.merchandise.product.id === productId).reduce((a, l) => a + l.quantity, 0) ?? 0,
      addToCart: (p, opts = {}) => {
        const variant = opts.variantId ? p.variants.nodes.find(v => v.id === opts.variantId) : defaultVariant(p)
        const quantity = Math.max(1, Math.floor(opts.quantity ?? 1))
        if (!variant?.availableForSale) return Promise.resolve(null)
        const merchandiseId = variant.id
        const fresh = () => createCart(lang, [{ merchandiseId, quantity }])
        // If Shopify has expired the saved cart, start a new one instead of failing; any other error still surfaces.
        const addTo = (id: string) => addCartLine(id, merchandiseId, quantity, lang)
          .catch(async e => { if ((await getCart(id, lang).catch(() => undefined)) === null) return fresh(); throw e })
        return run(id => (id ? addTo(id) : fresh()), () => {
          setJustAdded(j => ({ ...j, [p.id]: true }))
          showToast(t.toastAdded)
          setTimeout(() => setJustAdded(j => ({ ...j, [p.id]: false })), 1400)
        })
      },
      buyNow: async (p, opts) => {
        const variant = p.variants.nodes.find(v => v.id === opts.variantId)
        if (!variant?.availableForSale) return null
        try {
          const cart = await createCart(lang, [{ merchandiseId: variant.id, quantity: Math.max(1, Math.floor(opts.quantity)) }])
          const href = checkoutHref(cart.checkoutUrl)
          if (!href) throw new Error('Shopify returned an unusable checkout URL')
          return href
        } catch {
          showToast(t.checkoutError)
          return null
        }
      },
      setLineQty: (lineId, q) => run(id => updateCartLine(id!, lineId, q, lang)),
      removeLine: (lineId) => run(id => removeCartLine(id!, lineId, lang)),
      toggleWish: (id) => {
        const on = !wish[id]
        setWish(w => {
          const next = { ...w }
          if (on) next[id] = true; else delete next[id]
          return next
        })
        showToast(on ? t.toastWishOn : t.toastWishOff)
      },
      route: (path) => (e) => {
        e?.preventDefault()
        setPanel('none')
        const m = path.match(/^\/collections\/([^/?#]+)$/)
        // Product pages resolve any handle; an unknown one shows the page's not-found state.
        if (path === '/' || (m && COLLECTION_SLUGS.includes(m[1])) || /^\/products\/[^/?#]+(\?[^#]*)?$/.test(path)
          || POLICY_SLUGS.some(s => path === `/pages/${s}`)) {
          if (path === pathname) window.scrollTo({ top: 0, behavior: 'smooth' })
          else navigate(path)
          return
        }
        showToast(t.route(path))
      },
      goHome: (e) => {
        e?.preventDefault()
        setPanel('none')
        if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
        else navigate('/')
      },
      scrollToId: (id) => (e) => {
        e?.preventDefault()
        setPanel('none')
        const el = document.getElementById(id)
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' })
      },
      scrollTop: (e) => {
        e?.preventDefault()
        setPanel('none')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    }
  }, [lang, ar, t, fmt, cart, wish, justAdded, toast, panel, showToast, navigate, pathname])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
