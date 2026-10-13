// GlideSelect: a listbox-style select whose highlight pill glides between rows. Ported to TypeScript for
// this project: icons come from ./Icons, alignment uses logical start/end so it mirrors in RTL, and the
// default colours are Bahr's.
import {
  useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode,
} from 'react'
import { CheckIcon, ChevronIcon } from './Icons'
import './GlideSelect.css'

const SIZES = {
  sm: { chip: 28, row: 26, font: 12 },
  md: { chip: 32, row: 30, font: 13 },
  lg: { chip: 44, row: 40, font: 15 },
} as const
const PAD = 4
const GAP = 1
const MENU_GAP = 6

export interface GlideOption<V extends string = string> {
  value: V
  label: ReactNode
  tag?: ReactNode
}

type Phase = 'closed' | 'open' | 'closing'

const textOf = (it: GlideOption) => (typeof it.label === 'string' ? it.label : it.value)
const typeaheadIndex = (items: GlideOption[], from: number, ch: string) => {
  const c = ch.toLowerCase()
  const n = items.length
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n
    if (textOf(items[i]).toLowerCase().startsWith(c)) return i
  }
  return from
}

export interface GlideSelectProps<V extends string> {
  options: (GlideOption<V> | V)[]
  value?: V
  defaultValue?: V
  onChange?: (value: V, option: GlideOption<V>) => void
  placeholder?: string
  showTags?: boolean
  accentColor?: string
  surfaceColor?: string
  highlightColor?: string
  textColor?: string
  size?: keyof typeof SIZES
  radius?: number
  menuWidth?: number
  placement?: 'bottom' | 'top'
  /** Logical alignment: `start` is the left edge in LTR and the right edge in RTL. */
  align?: 'start' | 'end'
  popDuration?: number
  glideDuration?: number
  rememberPosition?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function GlideSelect<V extends string>({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  showTags = true,
  accentColor = '#11604B',
  surfaceColor = '#FFFDF8',
  highlightColor = '#F1EADF',
  textColor = '#1D2220',
  size = 'md',
  radius = 10,
  menuWidth = 176,
  placement = 'bottom',
  align = 'start',
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  disabled = false,
  ariaLabel = 'Select',
  className = '',
}: GlideSelectProps<V>) {
  const items: GlideOption<V>[] = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))
  const [inner, setInner] = useState<V | ''>(defaultValue ?? '')
  const current = value ?? inner
  const selected = items.findIndex(it => it.value === current)
  const [rawPhase, setPhase] = useState<Phase>('closed')
  // A disabled select is always closed.
  const phase: Phase = disabled ? 'closed' : rawPhase
  const [active, setActive] = useState<number | null>(null)
  const [side, setSide] = useState(placement)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const instant = useRef(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const scrub = useRef<{ id: number; top: number } | null>(null)
  const id = useId()
  const S = SIZES[size] ?? SIZES.md
  const step = S.row + GAP
  const popOut = Math.round((popDuration * 2) / 3)

  // On open: flip above the trigger if there's no room below, then play the pop-in.
  useLayoutEffect(() => {
    if (phase !== 'open') return
    const el = menuRef.current
    const root = rootRef.current
    if (!el || !root) return
    const r = root.getBoundingClientRect()
    const need = el.offsetHeight + MENU_GAP
    const next =
      placement === 'bottom' && r.bottom + need > window.innerHeight && r.top - need >= 0 ? 'top'
        : placement === 'top' && r.top - need < 0 ? 'bottom'
          : placement
    setSide(next)
    el.style.transitionDuration = instant.current ? '0ms' : ''
    el.dataset.state = 'closed'
    void el.offsetHeight
    el.dataset.state = 'open'
    const p = pillRef.current
    if (p) {
      p.style.transition = 'none'
      p.style.transform = `translateY(${Math.max(0, selected) * step}px)`
      p.style.opacity = '0'
      void p.offsetHeight
      p.style.transition = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Move the highlight pill to the active row; jump (no glide) when it first appears.
  useLayoutEffect(() => {
    const p = pillRef.current
    if (!p || phase !== 'open') return
    if (active === null) {
      p.style.opacity = '0'
      return
    }
    const jump = instant.current || p.style.opacity !== '1'
    p.style.transitionDuration = jump ? '0ms, 150ms' : ''
    p.style.transform = `translateY(${active * step}px)`
    p.style.opacity = '1'
    instant.current = false
  }, [active, phase, step])

  const open = (viaKey: boolean) => {
    if (disabled) return
    clearTimeout(closeTimer.current)
    instant.current = true
    setActive(selected >= 0 ? selected : viaKey ? 0 : null)
    setPhase('open')
  }
  const close = (mode: 'instant' | 'pop') => {
    setActive(null)
    clearTimeout(closeTimer.current)
    const el = menuRef.current
    if (mode === 'instant' || !el) {
      setPhase('closed')
      return
    }
    el.style.transitionDuration = ''
    el.dataset.state = 'closed'
    setPhase('closing')
    closeTimer.current = window.setTimeout(() => setPhase('closed'), popOut + 20)
  }
  const pick = (i: number, viaKey: boolean) => {
    const it = items[i]
    if (!it) {
      close('instant')
      return
    }
    if (it.value !== current) {
      if (value === undefined) setInner(it.value)
      onChange?.(it.value, it)
      if (!viaKey && rootRef.current) rootRef.current.dataset.swap = ''
    }
    close('instant')
    triggerRef.current?.focus({ preventScroll: true })
    // The menu unmounts on pointerup, so the click that follows would land on whatever was underneath
    // (on touch, often a product card). Swallow that one click.
    if (!viaKey) {
      const swallow = (ev: MouseEvent) => { ev.preventDefault(); ev.stopPropagation() }
      document.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => document.removeEventListener('click', swallow, true), 400)
    }
  }

  const onTriggerKey = (e: KeyboardEvent) => {
    const k = e.key
    const n = items.length
    const cur = active ?? Math.max(0, selected)
    if (phase !== 'open') {
      if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault()
        open(true)
      }
      return
    }
    const go = (i: number) => {
      e.preventDefault()
      instant.current = true
      setActive(Math.min(n - 1, Math.max(0, i)))
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') go(active === null ? cur : cur + (k === 'ArrowDown' ? 1 : -1))
    else if (k === 'Home' || k === 'End') go(k === 'Home' ? 0 : n - 1)
    else if (k === 'Enter' || k === ' ') {
      e.preventDefault()
      pick(cur, true)
    } else if (k === 'Escape' || k === 'Tab') {
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation() }
      close('instant')
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) go(typeaheadIndex(items, cur, k))
  }

  // Close on a pointer press anywhere outside.
  useEffect(() => {
    if (phase === 'closed') return undefined
    const onDown = (e: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close('pop')
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])
  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // Press-and-drag ("scrub") through the rows; release on a row picks it.
  const rowAt = (y: number) => {
    const s = scrub.current
    if (!s) return null
    const i = Math.floor((y - s.top - PAD) / step)
    return i >= 0 && i < items.length ? i : null
  }
  const onListDown = (e: PointerEvent<HTMLDivElement>) => {
    if (scrub.current) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
    scrub.current = { id: e.pointerId, top: e.currentTarget.getBoundingClientRect().top }
    instant.current = true
    setActive(rowAt(e.clientY))
  }
  const onListMove = (e: PointerEvent) => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return
    const i = rowAt(e.clientY)
    if (i !== active) setActive(i)
  }
  const onListUp = (e: PointerEvent) => {
    if (!scrub.current || scrub.current.id !== e.pointerId) return
    const i = e.type === 'pointerup' ? rowAt(e.clientY) : null
    scrub.current = null
    if (i !== null) pick(i, false)
    else if (!rememberPosition) setActive(null)
  }
  const onListOver = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || scrub.current) return
    const row = (e.target as Element).closest<HTMLElement>('[data-index]')
    if (!row) return
    const i = Number(row.dataset.index)
    if (i !== active) setActive(i)
  }

  const style = {
    '--gs-accent': accentColor,
    '--gs-surface': surfaceColor,
    '--gs-highlight': highlightColor,
    '--gs-text': textColor,
    '--gs-radius': `${radius}px`,
    '--gs-inner-radius': `${Math.max(3, radius - 4)}px`,
    '--gs-chip': `${S.chip}px`,
    '--gs-row': `${S.row}px`,
    '--gs-font': `${S.font}px`,
    '--gs-menu-w': `${menuWidth}px`,
    '--gs-pop': `${popDuration}ms`,
    '--gs-pop-out': `${popOut}ms`,
    '--gs-glide': `${glideDuration}ms`,
  } as CSSProperties

  return (
    <div
      ref={rootRef}
      className={`glide-select${className ? ` ${className}` : ''}`}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      style={style}
      onAnimationEnd={e => {
        if (e.animationName === 'gs-swap' && rootRef.current) delete rootRef.current.dataset.swap
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={phase === 'open'}
        aria-controls={`${id}-list`}
        aria-activedescendant={active !== null ? `${id}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className="glide-select__trigger"
        onPointerDown={e => {
          if (e.button !== 0 || disabled) return
          // Pointer focus shouldn't draw the keyboard focus ring.
          if (rootRef.current) rootRef.current.dataset.pointer = ''
          e.currentTarget.focus({ preventScroll: true })
          if (phase === 'open') close('pop')
          else open(false)
        }}
        onKeyDown={e => {
          if (rootRef.current) delete rootRef.current.dataset.pointer
          onTriggerKey(e)
        }}
        onBlur={() => { if (rootRef.current) delete rootRef.current.dataset.pointer }}
      >
        <span className="glide-select__label" key={current} data-empty={selected < 0 ? '' : undefined}>
          {selected >= 0 ? items[selected].label : placeholder}
        </span>
        <span className="glide-select__chevron" aria-hidden="true"><ChevronIcon size={13} strokeWidth="2.2" /></span>
      </button>
      {phase !== 'closed' ? (
        <div ref={menuRef} className="glide-select__menu" data-state="open" data-side={side} data-align={align}>
          <div
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            className="glide-select__list"
            data-live={active !== null ? '' : undefined}
            onPointerOver={onListOver}
            onPointerLeave={() => {
              if (!scrub.current && !rememberPosition) setActive(null)
            }}
            onPointerDown={onListDown}
            onPointerMove={onListMove}
            onPointerUp={onListUp}
            onPointerCancel={onListUp}
            onLostPointerCapture={onListUp}
          >
            <span ref={pillRef} className="glide-select__pill" aria-hidden="true" />
            {items.map((it, i) => (
              <div
                key={it.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === selected}
                data-index={i}
                className="glide-select__option"
              >
                <span className="glide-select__name">{it.label}</span>
                {showTags && it.tag ? <span className="glide-select__tag">{it.tag}</span> : null}
                <span className="glide-select__check" data-on={i === selected ? '' : undefined} aria-hidden="true">
                  <CheckIcon size={15} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
