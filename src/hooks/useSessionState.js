import { useEffect, useState } from 'react'

// Session preferences describe the current view; they never contain plan data.
export function useSessionState(key, initialValue, isValid) {
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(key))
      if (isValid(saved)) return saved
    } catch {
      // An unavailable or outdated preference must not prevent opening the plan.
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue
  })

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // The planner remains usable when browser storage is unavailable.
    }
  }, [key, value])

  return [value, setValue]
}
