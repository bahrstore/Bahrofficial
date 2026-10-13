import { useEffect, useRef, useState } from 'react'
import { productCategory, productPrice } from '../lib/product'
import { usePredictiveSearch } from '../lib/useShopify'
import { useStore } from '../store'
import { useIsDesktop, useIsMobile } from '../useMedia'
import { useNavItems } from '../useNavItems'
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from './Icons'

export function Announcement() {
  const { t } = useStore()
    const isMobile = useIsMobile()
  return (
    <div role="region" aria-label={t.announceLabel} className="announce">
      <div className="wrap">
        <span className="diamond" />
        <span>{t.announce}</span>
        {!isMobile && <><span style={{ color: '#C9BFA9' }}>·</span><span style={{ color: '#D9CFBC' }}>{t.announce2}</span></>}
      </div>
    </div>
  )
}

export function Header() {
  const s = useStore()
  const { t, ar, panel, setPanel, route, goHome } = s
  const isDesktop = useIsDesktop()
  const isMobile = useIsMobile()
  const nav = useNavItems()
  const searchOpen = panel === 'search'
  const wishCount = Object.keys(s.wish).length

  return (
    <header className="header">
      <div className="header-bar">
        {!isDesktop && (
          <button type="button" className="icon-btn menu-btn" onClick={() => setPanel('menu')} aria-label={t.menu} aria-expanded={panel === 'menu'}>
            <MenuIcon />
          </button>
        )}
        <a href="/" onClick={goHome} aria-label="Bahr — home" className="brand">
          <img src="/assets/bahr-mark.png" alt="" width={40} height={40} />
          <span className="brand-text">
            <span className="brand-en">BAHR</span>
            <span lang="ar" className="brand-ar">بحر</span>
          </span>
        </a>
        {isDesktop ? (
          <nav aria-label={t.mainNav} className="main-nav">
            <ul>
              {nav.map(n => <li key={n.href}><a href={n.href} onClick={n.onClick} aria-current={n.current ? 'page' : undefined}>{n.label}</a></li>)}
            </ul>
          </nav>
        ) : <div className="header-spacer" />}
        <div className="header-tools">
          <button type="button" className="icon-btn" onClick={() => setPanel(searchOpen ? 'none' : 'search')} aria-label={t.search} aria-expanded={searchOpen}>
            <SearchIcon />
          </button>
          {/* Phones get a short label so the switch fits beside the logo. */}
          <button type="button" className="lang-btn" onClick={() => s.setLang(ar ? 'en' : 'ar')} aria-label={t.switchLang}>
            <span lang={ar ? 'en' : 'ar'}>{isMobile ? (ar ? 'EN' : 'عربي') : t.otherLang}</span>
            {!isMobile && <span className="cur">BHD</span>}
          </button>
          {!isMobile && (
            <>
              <a href="/account" onClick={route('/account')} aria-label={t.account} className="icon-btn"><UserIcon /></a>
              <a href="/wishlist" onClick={route('/wishlist')} aria-label={`${t.wishlist}: ${s.num(wishCount)}`} className="icon-btn wish-link">
                <HeartIcon />
                {wishCount > 0 && <span className="wish-count">{s.num(wishCount)}</span>}
              </a>
            </>
          )}
          <button type="button" className="cart-btn" onClick={() => setPanel('cart')} aria-label={`${t.cart}: ${t.items(s.num(s.cartCount))}`}>
            <BagIcon />
            <span aria-hidden="true" className={'cart-pill' + (s.cartCount ? ' has' : '')}>{s.num(s.cartCount)}</span>
          </button>
        </div>
      </div>
      {searchOpen && <SearchPanel />}
    </header>
  )
}

/** How many suggestions the search panel shows, and how long typing must pause before asking Shopify. */
const SUGGESTIONS = 6
const SEARCH_DELAY_MS = 250

function SearchPanel() {
  const { t, lang, money, catLabel, setPanel, route } = useStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  // Shopify predictive search, asked once typing pauses rather than on every keystroke.
  const q = query.trim()
  const [asked, setAsked] = useState('')
  useEffect(() => {
    const id = window.setTimeout(() => setAsked(q), SEARCH_DELAY_MS)
    return () => clearTimeout(id)
  }, [q])
  const search = usePredictiveSearch(asked, lang, SUGGESTIONS)
  const pending = asked !== q || search.loading
  const results = (search.data ?? []).slice(0, SUGGESTIONS)

  return (
    <div className="search-panel">
      <form role="search" className="search-form" onSubmit={(e) => { e.preventDefault(); if (q) route('/search?q=' + encodeURIComponent(q))() }}>
        <label htmlFor="bahr-q" className="sr-only">{t.search}</label>
        <div className="search-row">
          <SearchIcon />
          <input id="bahr-q" ref={inputRef} type="search" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPh} />
          <button type="button" className="icon-btn" onClick={() => setPanel('none')} aria-label={t.close}><CloseIcon size={18} /></button>
        </div>
        {q && (
          <div aria-live="polite">
            {pending ? <p className="search-empty">{t.searching}</p> : search.error ? <p className="search-empty">{t.searchError}</p> : results.length > 0 ? (
              <>
                <ul className="search-results">
                  {results.map(p => (
                    <li key={p.id}>
                      <a href={'/products/' + p.handle} onClick={route('/products/' + p.handle)}>
                        <span><span className="name">{p.title}</span>{productCategory(p) && <span className="cat">{catLabel(productCategory(p)!)}</span>}</span>
                        <span className="price">{money(productPrice(p))}</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="search-note">{t.searchHint}</p>
              </>
            ) : <p className="search-empty">{t.searchEmpty(q)}</p>}
          </div>
        )}
      </form>
    </div>
  )
}
