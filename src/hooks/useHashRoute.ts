import { useEffect, useState } from 'react'

// Hash routing keeps the app deployable to any static host (GitHub Pages included)
// without server rewrites.
export const ROUTES = ['dashboard', 'products', 'movements', 'settings'] as const
export type Route = (typeof ROUTES)[number] | 'not-found'

export interface Location {
  route: Route
  params: URLSearchParams
}

function parse(hash: string): Location {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const name = path || 'dashboard'
  const route = (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'not-found'
  return { route, params: new URLSearchParams(query) }
}

export function useHashRoute(): Location {
  const [location, setLocation] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setLocation(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return location
}

export const href = (route: Exclude<Route, 'not-found'>, params?: Record<string, string>) =>
  `#/${route}${params ? `?${new URLSearchParams(params)}` : ''}`
