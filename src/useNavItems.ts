import { useLocation } from 'react-router-dom'
import { NAV_HREFS } from './data'
import { useStore } from './store'

export function useNavItems() {
  const { t, route } = useStore()
  const { pathname } = useLocation()
  return t.nav.map((label, i) => ({
    label,
    href: NAV_HREFS[i],
    onClick: route(NAV_HREFS[i]),
    current: i > 0 && pathname === NAV_HREFS[i],
  }))
}
