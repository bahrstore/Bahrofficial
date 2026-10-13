import type { CSSProperties } from 'react'
import type { Rating } from '../lib/types'
import { useStore } from '../store'

const STAR = 'M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z'
/** One decorative star in the review gold. */
export const StarGlyph = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="star-glyph"><path d={STAR} /></svg>
)
const row = (size: number) => Array.from({ length: 5 }, (_, i) => (
  <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
))

/**
 * Five stars from the product's review rating, filled in proportion (e.g. 4.5 → four and a half). Without
 * reviews it shows five empty stars. `detail` adds the score and review count as text (product page);
 * `label` replaces the spoken description (e.g. a single review's score).
 */
export function Stars({ rating, size = 14, detail = false, label: labelProp }: { rating: Rating | null; size?: number; detail?: boolean; label?: string }) {
  const { t, num } = useStore()
  const outOf5 = rating ? Math.round((rating.value / rating.scaleMax) * 50) / 10 : 0
  const fill = { '--fill': `${(outOf5 / 5) * 100}%` } as CSSProperties
  const label = labelProp ?? (rating ? t.ratedOf(num(outOf5), num(rating.count)) : t.noReviews)

  return (
    <span className={'stars' + (detail ? ' stars-detail' : '')}>
      <span role="img" aria-label={label} className="stars-icons" style={fill}>
        <span className="stars-empty">{row(size)}</span>
        <span className="stars-full">{row(size)}</span>
      </span>
      {detail
        ? <span aria-hidden="true" className="stars-text">{rating ? <><b>{num(outOf5)}</b> ({t.reviews(num(rating.count))})</> : t.noReviews}</span>
        : rating && rating.count > 0 && <span aria-hidden="true" className="stars-text">({num(rating.count)})</span>}
    </span>
  )
}
