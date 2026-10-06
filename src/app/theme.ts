import { useCallback, useEffect, useState } from 'react'
import { storage } from '../lib/storage'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'resumy:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Applies a theme to the document; colors come from the tokens it selects. */
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  const background = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
}

/**
 * The initial theme (and the browser's theme color) is applied by
 * public/theme.js before first paint. This hook keeps it in sync: it follows the system setting
 * until the person picks a theme, which is then remembered.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      if (!storage.get(THEME_KEY)) setTheme(event.matches ? 'dark' : 'light')
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((previous) => {
      const next = previous === 'dark' ? 'light' : 'dark'
      storage.set(THEME_KEY, next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
