import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { imageSrcSet, imageUrl } from '../lib/product'
import type { Image } from '../lib/types'
import { useStore } from '../store'
import { BagIcon, CloseIcon, ExpandIcon } from './Icons'

const MAIN_WIDTHS = [480, 720, 960, 1280]
const MAIN_SIZES = '(min-width: 1140px) 680px, (min-width: 760px) 50vw, 100vw'

/**
 * Product images: a swipeable, scroll-snapped stage with previous/next buttons, a thumbnail row and an
 * enlarged view in a modal <dialog>. `focusUrl` (the selected variant's image) brings that image into view.
 */
export function ProductGallery({ images, title, productType, focusUrl, badge }: {
  images: Image[]
  title: string
  productType: string
  focusUrl?: string
  badge?: ReactNode
}) {
  const { t, ar, num } = useStore()
  const track = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<Record<string, true>>({})
  const n = images.length
  const many = n > 1
  const current = Math.min(index, Math.max(0, n - 1))

  // Scrolls the stage to slide i. RTL scroll offsets run from 0 down to -(scrollWidth - clientWidth).
  const scrollToSlide = (i: number, smooth = true) => {
    const el = track.current
    const slide = el?.children[i] as HTMLElement | undefined
    if (!el || !slide) return
    const left = ar ? slide.offsetLeft - (el.scrollWidth - el.clientWidth) : slide.offsetLeft
    el.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' })
  }
  const go = (i: number) => {
    const k = (i + n) % n
    setIndex(k)
    scrollToSlide(k)
  }

  const scrollRef = useRef(scrollToSlide)
  useEffect(() => { scrollRef.current = scrollToSlide })

  // Selecting a variant with its own image shows that image.
  useEffect(() => {
    const i = focusUrl ? images.findIndex(im => im.url === focusUrl) : -1
    if (i >= 0) scrollRef.current(i)
  }, [focusUrl, images])

  // Keep the stage on the current slide when the layout direction flips.
  useEffect(() => { scrollRef.current(index, false) }, [ar]) // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = track.current
    if (!el || !el.clientWidth) return
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth)
    if (i !== index && i >= 0 && i < n) setIndex(i)
  }

  const onKey = (e: KeyboardEvent) => {
    if (!many) return
    const back = ar ? 'ArrowRight' : 'ArrowLeft'
    const fwd = ar ? 'ArrowLeft' : 'ArrowRight'
    if (e.key === back) { e.preventDefault(); go(current - 1) }
    if (e.key === fwd) { e.preventDefault(); go(current + 1) }
  }

  const open = () => dialog.current?.showModal()
  const close = () => dialog.current?.close()
  const alt = (img: Image, i: number) => img.altText || (many ? `${title} — ${t.imageOf(num(i + 1), num(n))}` : title)
  const prevArrow = ar ? '→' : '←'
  const nextArrow = ar ? '←' : '→'

  if (n === 0) {
    return (
      <div className="pdp-gallery">
        <div className="pdp-stage">
          <div className="pdp-noimg"><BagIcon size={34} /><span>{t.noImage}</span><span className="type">{productType}</span></div>
          {badge}
        </div>
      </div>
    )
  }

  return (
    <div className="pdp-gallery" role="region" aria-roledescription="carousel" aria-label={t.gallery} onKeyDown={onKey}>
      <div className="pdp-stage">
        <div ref={track} className="pdp-track" onScroll={onScroll}>
          {images.map((img, i) => (
            <div key={img.url} className="pdp-slide" aria-roledescription="slide" aria-label={t.imageOf(num(i + 1), num(n))} aria-hidden={i !== current}>
              {failed[img.url] ? (
                <div className="pdp-noimg"><BagIcon size={34} /><span>{t.noImage}</span><span className="type">{productType}</span></div>
              ) : (
                <button type="button" className="pdp-zoom" onClick={open} tabIndex={i === current ? 0 : -1} aria-label={`${t.enlarge}: ${alt(img, i)}`}>
                  <img
                    src={imageUrl(img, 960)} srcSet={imageSrcSet(img, MAIN_WIDTHS)} sizes={MAIN_SIZES} alt={alt(img, i)}
                    loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} decoding="async" onError={() => setFailed(f => ({ ...f, [img.url]: true }))}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
        {badge}
        {!failed[images[current].url] && <span aria-hidden="true" className="pdp-zoom-hint"><ExpandIcon size={16} /></span>}
        {many && (
          <>
            <button type="button" className="pdp-nav prev" onClick={() => go(current - 1)} aria-label={t.prevImage}>{prevArrow}</button>
            <button type="button" className="pdp-nav next" onClick={() => go(current + 1)} aria-label={t.nextImage}>{nextArrow}</button>
            <span aria-hidden="true" className="pdp-count">{num(current + 1)} / {num(n)}</span>
          </>
        )}
      </div>

      {many && (
        <ul className="pdp-thumbs">
          {images.map((img, i) => (
            <li key={img.url}>
              <button type="button" className="pdp-thumb" onClick={() => go(i)} aria-current={i === current} aria-label={t.imageOf(num(i + 1), num(n))}>
                {failed[img.url]
                  ? <BagIcon size={18} />
                  : <img src={imageUrl(img, 200)} srcSet={`${imageUrl(img, 200)} 1x, ${imageUrl(img, 400)} 2x`} alt="" loading="lazy" decoding="async" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialog} className="pdp-lightbox" aria-label={t.gallery} onClick={(e) => { if (e.target === e.currentTarget) close() }}>
        <div className="pdp-lb-inner">
          <img src={imageUrl(images[current], 1600)} alt={alt(images[current], current)} decoding="async" />
          <button type="button" className="pdp-lb-close icon-btn" onClick={close} aria-label={t.close}><CloseIcon /></button>
          {many && (
            <div className="pdp-lb-ctrl">
              <button type="button" className="pdp-nav" onClick={() => go(current - 1)} aria-label={t.prevImage}>{prevArrow}</button>
              <span>{num(current + 1)} / {num(n)}</span>
              <button type="button" className="pdp-nav" onClick={() => go(current + 1)} aria-label={t.nextImage}>{nextArrow}</button>
            </div>
          )}
        </div>
      </dialog>
    </div>
  )
}
