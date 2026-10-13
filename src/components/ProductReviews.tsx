import { useCallback, useEffect, useRef, useState } from 'react'
import { imageUrl, reviewSummary } from '../lib/product'
import type { Image, Review } from '../lib/types'
import { useStore } from '../store'
import { StarGlyph, Stars } from './Stars'

/** Photo tiles shown before the "+N" tile. */
const PHOTO_LIMIT = 10

/**
 * Product-page review section: summary with star bars, customer photos and a row of review cards.
 * Shows an empty layout until the product has reviews (product_review metaobjects in Shopify).
 */
export function ProductReviews({ reviews }: { reviews: Review[] }) {
  const { t, num } = useStore()
  const { count, average, bars, recommendPct, rating } = reviewSummary(reviews)
  const photos = reviews.flatMap(r => r.photos.map(img => ({ img, author: r.author || t.revAnon })))
  const [allPhotos, setAllPhotos] = useState(false)
  const shown = allPhotos || photos.length <= PHOTO_LIMIT ? photos : photos.slice(0, PHOTO_LIMIT - 1)
  const avg = Math.round(average * 10) / 10

  return (
    <section aria-labelledby="reviews-h" id="reviews" className="pdp-reviews">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow"><span className="diamond" />{t.revEyebrow}</p>
            <h2 id="reviews-h" className="h2">{t.revTitle}</h2>
          </div>
        </div>

        <div className="rv-top">
          <div className="rv-card rv-summary">
            <h3 className="rv-h">{t.revSummary}</h3>
            <div className="rv-score">
              <span aria-hidden="true" className="rv-avg">{count ? num(avg) : num(0)}</span>
              <div>
                {/* The count is already in the line below, so the stars don't repeat it. */}
                <Stars rating={rating && { ...rating, count: 0 }} size={18} label={rating ? t.ratedOf(num(avg), num(count)) : undefined} />
                <p className="rv-based">{count ? t.revBased(num(count)) : t.noReviews}</p>
              </div>
            </div>
            {recommendPct !== null && <p className="rv-rec"><b>{num(recommendPct)}%</b> {t.revRecommend}</p>}
            <ul className="rv-bars">
              {bars.map(({ star, n }) => (
                <li key={star} aria-label={t.revRow(num(star), num(n))}>
                  <span aria-hidden="true" className="rv-star">{num(star)}<StarGlyph /></span>
                  <span aria-hidden="true" className="rv-bar"><span style={{ width: count ? `${(n / count) * 100}%` : 0 }} /></span>
                  <span aria-hidden="true" className="rv-n">{num(n)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rv-card rv-photos">
            <h3 className="rv-h">{t.revPhotos}</h3>
            {photos.length ? (
              <ul className={'rv-grid' + (shown.length + (shown.length < photos.length ? 1 : 0) > 5 ? ' fill' : '')}>
                {shown.map(({ img, author }, i) => <li key={img.url + i}><PhotoLink img={img} label={t.revPhoto(author)} /></li>)}
                {shown.length < photos.length && (
                  <li>
                    <button type="button" className="rv-more" onClick={() => setAllPhotos(true)} aria-label={t.revMore(num(photos.length - shown.length))}>
                      <img src={imageUrl(photos[shown.length].img, 200)} alt="" loading="lazy" />
                      <span>+{num(photos.length - shown.length)}</span>
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <div className="rv-placeholder">
                <ul aria-hidden="true" className="rv-grid fill">{Array.from({ length: PHOTO_LIMIT }, (_, i) => <li key={i} />)}</ul>
                <p>{t.revNoPhotos}</p>
              </div>
            )}
          </div>
        </div>

        <Comments reviews={reviews} />
      </div>
    </section>
  )
}

function PhotoLink({ img, label }: { img: Image; label: string }) {
  return (
    <a href={img.url} target="_blank" rel="noopener noreferrer" className="rv-photo">
      <img src={imageUrl(img, 200)} alt={img.altText || label} loading="lazy" />
    </a>
  )
}

function Comments({ reviews }: { reviews: Review[] }) {
  const { t, ar } = useStore()
  const track = useRef<HTMLUListElement>(null)
  const [all, setAll] = useState(false)
  const [edge, setEdge] = useState({ start: true, end: true })

  // Which ends of the row are reached (scrollLeft runs negative in RTL, so compare magnitudes).
  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    const x = Math.abs(el.scrollLeft)
    setEdge({ start: x <= 2, end: x + el.clientWidth >= el.scrollWidth - 2 })
  }, [])
  useEffect(() => {
    const el = track.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, all, reviews.length])

  const step = (dir: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: dir * (ar ? -1 : 1) * el.clientWidth * 0.9, behavior: 'smooth' })
  }
  const scrollable = !all && !(edge.start && edge.end)

  return (
    <div className="rv-comments">
      <div className="rv-comments-head">
        <h3 className="rv-h">{t.revComments}</h3>
        {reviews.length > 1 && (
          <div className="rv-nav">
            {(scrollable || all) && <button type="button" className="link-btn" onClick={() => setAll(a => !a)}>{all ? t.showLess : t.viewAll}</button>}
            {scrollable && (
              <>
                <button type="button" className="rv-arrow" onClick={() => step(-1)} disabled={edge.start} aria-label={t.revPrev}><span aria-hidden="true">{ar ? '→' : '←'}</span></button>
                <button type="button" className="rv-arrow" onClick={() => step(1)} disabled={edge.end} aria-label={t.revNext}><span aria-hidden="true">{ar ? '←' : '→'}</span></button>
              </>
            )}
          </div>
        )}
      </div>

      {reviews.length ? (
        <ul ref={track} onScroll={update} className={all ? 'rv-list' : 'rv-track'}>
          {reviews.map(r => <ReviewCard key={r.id} r={r} clamp={!all} />)}
        </ul>
      ) : (
        <div className="rv-card rv-empty">
          <span className="state-diamond" />
          <p className="rv-empty-title">{t.noReviews}</p>
          <p>{t.revEmptyText}</p>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ r, clamp }: { r: Review; clamp: boolean }) {
  const { t, num, date } = useStore()
  const name = r.author || t.revAnon
  const score = Math.round(r.rating * 10) / 10
  return (
    <li className="rv-card rv-review">
      <div className="rv-who">
        <span aria-hidden="true" className="rv-avatar">{name.trim().charAt(0).toUpperCase()}</span>
        <div>
          <p className="rv-name">{name}</p>
          <time dateTime={r.date} className="rv-date">{date(r.date)}</time>
        </div>
      </div>
      <div className="rv-rating">
        <span aria-hidden="true">{num(score)}/{num(5)}</span>
        <Stars rating={{ value: r.rating, scaleMax: 5, count: 0 }} size={14} label={t.revRated(num(score))} />
      </div>
      {r.title && <p className="rv-title">{r.title}</p>}
      {r.body && <p className={'rv-body' + (clamp ? ' clamp' : '')}>{r.body}</p>}
      {r.photos.length > 0 && (
        <ul className="rv-thumbs">
          {r.photos.slice(0, 4).map((img, i) => <li key={img.url + i}><PhotoLink img={img} label={t.revPhoto(name)} /></li>)}
        </ul>
      )}
    </li>
  )
}
