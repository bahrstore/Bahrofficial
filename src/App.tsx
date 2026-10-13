import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { CollectionPage } from './components/CollectionPage'
import { Collections } from './components/Collections'
import { Footer } from './components/Footer'
import { Announcement, Header } from './components/Header'
import { Hero } from './components/Hero'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Newsletter } from './components/Newsletter'
import { NotFound } from './components/NotFound'
import { PolicyPage } from './components/PolicyPage'
import { ProductPage } from './components/ProductPage'
import { CartDrawer, MenuDrawer, Toast } from './components/Overlays'
import { Promo } from './components/Promo'
import { Trending } from './components/Trending'
import { Trust } from './components/Trust'
import { COLLECTIONS, POLICY_PAGES } from './data'
import { useReveal, useSmoothWheel } from './motion'
import { StoreProvider, useStore } from './store'

const HOME_TITLE = document.title
const HOME_META = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''

function Home() {
  useReveal()
  useEffect(() => {
    document.title = HOME_TITLE
    document.querySelector('meta[name="description"]')?.setAttribute('content', HOME_META)
  }, [])
  return (
    <>
      <Hero />
      <Collections />
      <Trending />
      <Promo />
      <Trust />
      <Newsletter />
    </>
  )
}

function Collection() {
  const { slug = '' } = useParams()
  if (!COLLECTIONS[slug]) return <NotFound />
  // Keyed so switching collections starts fresh (loading state, scroll).
  return <CollectionPage key={slug} slug={slug} />
}

function Product() {
  const { handle = '' } = useParams()
  // Keyed so moving between products starts fresh (gallery position, selected variant, quantity).
  return <ProductPage key={handle} handle={handle} />
}

function Page() {
  const { slug = '' } = useParams()
  const kind = POLICY_PAGES[slug]
  if (!kind) return <NotFound />
  return <PolicyPage key={kind} kind={kind} />
}

function Layout() {
  const { ar, panel, t } = useStore()
  const { pathname } = useLocation()
  useSmoothWheel()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return (
    <div className="page" dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden="true" className="page-bg" />
      <Announcement />
      <Header />
      <main style={{ overflowX: 'clip' }}>
        <ErrorBoundary key={pathname} title={t.crashTitle} text={t.crashText} action={t.reload}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collections/:slug" element={<Collection />} />
          <Route path="/products/:handle" element={<Product />} />
          <Route path="/pages/:slug" element={<Page />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      {panel === 'menu' && <MenuDrawer />}
      {panel === 'cart' && <CartDrawer />}
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Layout />
      </StoreProvider>
    </BrowserRouter>
  )
}
