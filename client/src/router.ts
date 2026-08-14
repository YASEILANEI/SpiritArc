import { useCallback, useEffect, useState } from 'react'

export type Page = 'home' | 'ask' | 'shuffle' | 'cut' | 'draw' | 'analyzing'
  | 'result' | 'reading-result' | 'history' | 'login' | 'register' | 'profile'
  | 'about' | 'about-product' | 'support' | 'feedback' | 'chat'
  | 'admin' | 'admin-settings' | 'admin-users' | 'admin-readings' | 'admin-feedback'

export interface RouteParams {
  page: Page
  readingId: string | null
}

export const FLOW_PAGES: Set<Page> = new Set(['shuffle', 'cut', 'draw', 'analyzing'])
export const READING_PAGES: Set<Page> = new Set(['result', 'reading-result'])

const STATIC_PATHS: Record<string, Page> = {
  '': 'home',
  '/': 'home',
  '/ask': 'ask',
  '/history': 'history',
  '/login': 'login',
  '/register': 'register',
  '/profile': 'profile',
  '/about': 'about',
  '/about-product': 'about-product',
  '/support': 'support',
  '/feedback': 'feedback',
  '/admin': 'admin',
  '/admin/settings': 'admin-settings',
  '/admin/users': 'admin-users',
  '/admin/readings': 'admin-readings',
  '/admin/feedback': 'admin-feedback',
}

// Flow pages are never pushed into history, so the only way to land on one is
// a refresh or manual URL entry — at which point the flow state is lost.
const FLOW_PATHS: Set<string> = new Set(['/shuffle', '/cut', '/draw', '/analyzing'])

// Malformed percent-encoding (e.g. /result/%E0%A4%A) makes decodeURIComponent
// throw, which would crash the whole app — fall back to the raw string.
function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

export function parsePath(path: string): RouteParams | null {
  const staticPage = STATIC_PATHS[path]
  if (staticPage) return { page: staticPage, readingId: null }

  if (FLOW_PATHS.has(path)) return null

  const resultMatch = path.match(/^\/result\/(.+)$/)
  if (resultMatch) {
    return { page: 'result', readingId: safeDecode(resultMatch[1]) }
  }
  const readingResultMatch = path.match(/^\/(reading-result|chat)\/(.+)$/)
  if (readingResultMatch) {
    return { page: readingResultMatch[1] as Page, readingId: safeDecode(readingResultMatch[2]) }
  }

  return null
}

export function buildPath(page: Page, readingId?: string | null): string {
  if (page === 'result' || page === 'reading-result' || page === 'chat') {
    return readingId ? `/${page}/${encodeURIComponent(readingId)}` : `/${page}`
  }
  if (page === 'admin-settings') return '/admin/settings'
  if (page === 'admin-users') return '/admin/users'
  if (page === 'admin-readings') return '/admin/readings'
  if (page === 'admin-feedback') return '/admin/feedback'
  if (page === 'home') return '/'
  return `/${page}`
}

export function usePageRouter(): {
  page: Page
  readingId: string | null
  navigate: (page: Page, opts?: { replace?: boolean; readingId?: string | null }) => void
} {
  const [route, setRoute] = useState<RouteParams>(() =>
    parsePath(window.location.pathname) ?? { page: 'home', readingId: null },
  )

  const navigate = useCallback((page: Page, opts?: { replace?: boolean; readingId?: string | null }) => {
    const path = buildPath(page, opts?.readingId)
    const next = { page, readingId: opts?.readingId ?? null }
    if (path === window.location.pathname) {
      // Idempotent — same URL, just sync state without adding a history entry.
      setRoute(next)
      return
    }
    if (opts?.replace) {
      window.history.replaceState(null, '', path)
    } else {
      window.history.pushState(null, '', path)
    }
    setRoute(next)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const parsed = parsePath(window.location.pathname)
      if (!parsed) {
        // Flow/unknown paths are never valid history entries — normalize to home.
        window.history.replaceState(null, '', '/')
        setRoute({ page: 'home', readingId: null })
      } else {
        setRoute(parsed)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // On first load, normalize a flow/unknown URL (e.g. a bookmarked /shuffle) to home.
  useEffect(() => {
    if (!parsePath(window.location.pathname)) {
      window.history.replaceState(null, '', '/')
    }
  }, [])

  return { page: route.page, readingId: route.readingId, navigate }
}
