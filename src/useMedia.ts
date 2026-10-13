import { useSyncExternalStore } from 'react'

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

// Breakpoints from the design: mobile < 760px, desktop >= 1140px.
export const useIsDesktop = () => useMedia('(min-width: 1140px)')
export const useIsMobile = () => useMedia('(max-width: 759px)')
