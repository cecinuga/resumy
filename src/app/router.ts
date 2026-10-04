import { useEffect, useState } from 'react'

/**
 * Two pages do not need a routing library: this hook mirrors the URL into
 * React with the History API, so links, reloads and the back button work.
 */
export type Route = 'home' | 'editor'

const PATHS: Record<Route, string> = { home: '/', editor: '/editor' }
const NAVIGATE_EVENT = 'resumy:navigate'

export function routeFromPath(pathname: string): Route | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  return (Object.keys(PATHS) as Route[]).find((route) => PATHS[route] === path) ?? null
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

const currentRoute = (): Route => routeFromPath(window.location.pathname) ?? 'home'

/**
 * The current route; unknown paths resolve to the home page.
 * Plain state (rather than useSyncExternalStore) on purpose: a navigation
 * is then batched with the state updates made next to it, e.g. loading a
 * resume and opening the editor in the same handler.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => subscribe(() => setRoute(currentRoute())), [])
  return route
}

export function navigate(route: Route, { replace = false }: { replace?: boolean } = {}): void {
  const path = PATHS[route]
  if (window.location.pathname === path) return
  if (replace) window.history.replaceState(null, '', path)
  else window.history.pushState(null, '', path)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
  window.scrollTo({ top: 0 })
}

export function pathFor(route: Route): string {
  return PATHS[route]
}
