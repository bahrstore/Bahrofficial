import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const Base = ({ size = 20, children, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...rest}>
    {children}
  </svg>
)

export const MenuIcon = (p: P) => <Base size={22} {...p}><path d="M3 7h18M3 12h18M3 17h12" /></Base>
export const SearchIcon = (p: P) => <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Base>
export const CloseIcon = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>
export const HeartIcon = (p: P) => <Base {...p}><path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" /></Base>
export const BagIcon = (p: P) => <Base size={21} {...p}><path d="M5 8h14l-1.2 12H6.2L5 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Base>

const Trust = ({ children }: { children: ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const TRUST_ICONS = [
  <Trust key="cash"><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" /></Trust>,
  <Trust key="pin"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></Trust>,
  <Trust key="shield"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3z" /><path d="M8.8 12.2l2.2 2.2 4.2-4.4" /></Trust>,
]

export const TrustIcon = ({ i }: { i: number }) => TRUST_ICONS[i] ?? null

export const ChevronIcon = (p: P) => <Base size={14} strokeWidth="2" {...p}><path d="M6 9l6 6 6-6" /></Base>
export const FilterIcon = (p: P) => <Base size={18} {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Base>
export const ExpandIcon = (p: P) => <Base {...p}><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></Base>
export const CheckIcon = (p: P) => <Base strokeWidth="2" {...p}><path d="M5 12.5l4.2 4.2L19 7" /></Base>
