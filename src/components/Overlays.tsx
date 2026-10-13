import { checkoutHref, imageUrl } from '../lib/product'
import { useStore } from '../store'
import { useNavItems } from '../useNavItems'
import { CloseIcon } from './Icons'

export function MenuDrawer() {
  const { t, ar, arrow, wish, num, setLang, setPanel, route } = useStore()
  const nav = useNavItems()
  const close = () => setPanel('none')
  return (
    <div className="overlay">
      <div className="overlay-bg" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label={t.menu} className="drawer start">
        <div className="drawer-head">
          <span className="drawer-brand">BAHR</span>
          <button type="button" className="icon-btn" onClick={close} aria-label={t.close}><CloseIcon /></button>
        </div>
        <nav aria-label={t.mainNav} className="drawer-nav">
          <ul>
            {nav.map(n => <li key={n.href}><a href={n.href} onClick={n.onClick} aria-current={n.current ? 'page' : undefined}>{n.label}<span aria-hidden="true">{arrow}</span></a></li>)}
          </ul>
          <div className="drawer-links">
            <a href="/wishlist" onClick={route('/wishlist')}>{t.wishlist} · {num(Object.keys(wish).length)}</a>
          </div>
        </nav>
        <div className="drawer-foot">
          <button type="button" lang={ar ? 'en' : 'ar'} onClick={() => setLang(ar ? 'en' : 'ar')}>{t.otherLang}</button>
          <span>{t.currencyNote}</span>
        </div>
      </div>
    </div>
  )
}

export function CartDrawer() {
  const { t, cart, money, num, setLineQty, removeLine, setPanel, route } = useStore()
  const close = () => setPanel('none')
  const lines = cart?.lines.nodes ?? []

  return (
    <div className="overlay">
      <div className="overlay-bg" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label={t.cartTitle} className="drawer end">
        <div className="drawer-head cart-head">
          <h2>{t.cartTitle} <span>({num(cart?.totalQuantity ?? 0)})</span></h2>
          <button type="button" className="icon-btn" onClick={close} aria-label={t.close}><CloseIcon /></button>
        </div>
        {!cart || lines.length === 0 ? (
          <div className="cart-empty">
            <span className="diamond" />
            <p>{t.cartEmpty}</p>
            <a href="/collections/trending" onClick={route('/collections/trending')} className="btn btn-solid">{t.ctaPrimary}</a>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {lines.map(line => {
                const name = line.merchandise.product.title
                const variantTitle = line.merchandise.title === 'Default Title' ? '' : line.merchandise.title
                const href = '/products/' + line.merchandise.product.handle
                return (
                  <li key={line.id} className="cart-line">
                    {/* The variant's own image when it has one, else the product's; the product type when there's no photo. */}
                    <div className="cart-thumb">
                      {(line.merchandise.image ?? line.merchandise.product.featuredImage)
                        ? <img src={imageUrl((line.merchandise.image ?? line.merchandise.product.featuredImage)!, 160)} alt="" loading="lazy" decoding="async" />
                        : line.merchandise.product.productType}
                    </div>
                    <div className="cart-info">
                      <a href={href} onClick={route(href)} className="name">{name}</a>
                      {variantTitle && <span className="variant">{variantTitle}</span>}
                      <span className="line-total">{money(line.cost.totalAmount)}</span>
                      <div className="cart-actions">
                        <div className="qty">
                          <button type="button" onClick={() => setLineQty(line.id, line.quantity - 1)} aria-label={`${t.decrease}: ${name}`}>−</button>
                          <span aria-live="polite">{num(line.quantity)}</span>
                          <button type="button" onClick={() => setLineQty(line.id, line.quantity + 1)} aria-label={`${t.increase}: ${name}`}>+</button>
                        </div>
                        <button type="button" className="remove-btn" onClick={() => removeLine(line.id)}>{t.remove}</button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="cart-foot">
              <div className="sub"><span>{t.subtotal}</span><span>{money(cart.cost.subtotalAmount)}</span></div>
              <p>{t.checkoutNote}</p>
              {/* Shopify's hosted checkout; only an absolute https URL from Shopify is linked. */}
              {checkoutHref(cart.checkoutUrl)
                ? <a href={checkoutHref(cart.checkoutUrl)!} className="btn btn-solid">{t.checkout}</a>
                : <button type="button" className="btn btn-solid" disabled>{t.checkout}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Toast() {
  const { toast } = useStore()
  return (
    <div aria-live="polite" role="status" className="toast-region">
      {toast && <div className="toast"><span className="diamond" />{toast}</div>}
    </div>
  )
}
