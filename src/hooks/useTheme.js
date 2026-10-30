import { useEffect, useState } from 'react'

const THEME_SESSION_KEY = 'flowtree-theme'

function readTheme() {
  try {
    return window.sessionStorage.getItem(THEME_SESSION_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme)
  useEffect(() => {
    try {
      window.sessionStorage.setItem(THEME_SESSION_KEY, theme)
    } catch {
      // Theme preference is optional; storage failure must not block the plan.
    }
  }, [theme])
  return [theme, () => setTheme(current => current === 'light' ? 'dark' : 'light')]
}
